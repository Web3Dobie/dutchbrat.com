import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { sendTelegramNotification } from "@/lib/telegram";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { sendBookingEmail } from "@/lib/emailService";
import { generatePaymentReceivedEmail } from "@/lib/emailTemplates";
import { format } from "date-fns";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

interface MarkPaidRequest {
    booking_ids: number[];
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data: MarkPaidRequest = await request.json();

        if (!data.booking_ids || !Array.isArray(data.booking_ids) || data.booking_ids.length === 0) {
            return NextResponse.json(
                { error: "booking_ids array is required" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // First, validate that all bookings exist and are in 'completed' status
            const validateQuery = `
                SELECT
                    b.id,
                    b.status,
                    b.service_type,
                    b.price_pounds,
                    b.start_time,
                    b.owner_id,
                    o.owner_name,
                    COALESCE(d1.dog_name, '') as dog_name_1,
                    COALESCE(d2.dog_name, '') as dog_name_2,
                    COALESCE(d1.image_filename, '') as dog_image_1,
                    COALESCE(d2.image_filename, '') as dog_image_2
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                WHERE b.id = ANY($1);
            `;

            const validateResult = await client.query(validateQuery, [data.booking_ids]);

            if (validateResult.rows.length !== data.booking_ids.length) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "One or more booking IDs not found" },
                    { status: 404 }
                );
            }

            // Check if all bookings are in 'completed' status
            const invalidBookings = validateResult.rows.filter(booking => booking.status !== 'completed');
            if (invalidBookings.length > 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: `Cannot mark as paid. Some bookings are not in 'completed' status: ${invalidBookings.map(b => `#${b.id} (${b.status})`).join(', ')}` },
                    { status: 400 }
                );
            }

            // Update bookings to 'completed & paid'
            const updateQuery = `
                UPDATE hunters_hounds.bookings 
                SET status = 'completed & paid', updated_at = CURRENT_TIMESTAMP
                WHERE id = ANY($1) AND status = 'completed'
                RETURNING id;
            `;

            const updateResult = await client.query(updateQuery, [data.booking_ids]);
            const updatedCount = updateResult.rows.length;

            if (updatedCount === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "No bookings were updated. They may already be paid or in incorrect status." },
                    { status: 400 }
                );
            }

            await client.query('COMMIT');

            // Create review records and send payment emails for each booking
            const reviewResults: { bookingId: number; reviewToken: string | null; emailSent: boolean }[] = [];

            for (const booking of validateResult.rows) {
                try {
                    // Create review record with token
                    const createReviewQuery = `
                        INSERT INTO hunters_hounds.reviews (booking_id, owner_id)
                        VALUES ($1, $2)
                        ON CONFLICT (booking_id) DO NOTHING
                        RETURNING review_token;
                    `;
                    const reviewResult = await client.query(createReviewQuery, [booking.id, booking.owner_id]);

                    let reviewToken: string | null = null;

                    if (reviewResult.rows.length > 0) {
                        reviewToken = reviewResult.rows[0].review_token;
                    } else {
                        // Review already exists, fetch the token
                        const getTokenQuery = `
                            SELECT review_token FROM hunters_hounds.reviews WHERE booking_id = $1;
                        `;
                        const tokenResult = await client.query(getTokenQuery, [booking.id]);
                        if (tokenResult.rows.length > 0) {
                            reviewToken = tokenResult.rows[0].review_token;
                        }
                    }

                    // Build dog names and image URLs
                    const dogNames = [booking.dog_name_1, booking.dog_name_2].filter(n => n).join(' & ');
                    const dogImageUrls = [booking.dog_image_1, booking.dog_image_2]
                        .filter(img => img)
                        .map(img => `https://hunters-hounds.london/images/dogs/${img}`);

                    // Format service date
                    const serviceDate = format(new Date(booking.start_time), 'EEEE, MMMM d');

                    // Generate and send email
                    if (reviewToken) {
                        const reviewUrl = `https://hunters-hounds.london/review/${reviewToken}`;
                        const { subject, html } = generatePaymentReceivedEmail({
                            ownerName: booking.owner_name.split(' ')[0], // First name
                            dogNames,
                            dogImageUrls,
                            serviceType: booking.service_type,
                            serviceDate,
                            reviewUrl
                        });

                        await sendBookingEmail(booking.id, subject, html);
                        reviewResults.push({ bookingId: booking.id, reviewToken, emailSent: true });
                    } else {
                        reviewResults.push({ bookingId: booking.id, reviewToken: null, emailSent: false });
                    }
                } catch (emailError) {
                    console.error(`Failed to create review/send email for booking ${booking.id}:`, emailError);
                    reviewResults.push({ bookingId: booking.id, reviewToken: null, emailSent: false });
                }
            }

            // Send Telegram notification
            try {
                const bookingDetails = validateResult.rows.map(booking => {
                    const dogNames = [booking.dog_name_1, booking.dog_name_2].filter(n => n).join(', ');
                    const price = booking.price_pounds ? `£${parseFloat(booking.price_pounds).toFixed(2)}` : 'FREE';
                    return `#${booking.id}: ${booking.owner_name} - ${booking.service_type} (${dogNames}) - ${price}`;
                }).join('\n');

                const emailsSent = reviewResults.filter(r => r.emailSent).length;

                const telegramMessage = `
💰 <b>PAYMENTS RECEIVED</b> 💰

<b>Marked as Paid:</b> ${updatedCount} booking(s)
<b>Review Emails Sent:</b> ${emailsSent}

${bookingDetails}

<i>Status updated to 'completed & paid'</i>
                `.trim();

                await sendTelegramNotification(telegramMessage);
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
                // Don't fail the operation if Telegram fails
            }

            return NextResponse.json({
                success: true,
                updated_count: updatedCount,
                emails_sent: reviewResults.filter(r => r.emailSent).length,
                message: `${updatedCount} booking(s) marked as paid`
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Mark paid error:", error);
        return NextResponse.json(
            { error: "Failed to mark bookings as paid. Please try again." },
            { status: 500 }
        );
    }
}