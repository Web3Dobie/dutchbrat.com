import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { sendTelegramNotification } from "@/lib/telegram";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { sendBookingEmail } from "@/lib/emailService";
import { generateReviewRequestEmail } from "@/lib/emailTemplates";
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

interface RequestReviewRequest {
    booking_id: number;
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data: RequestReviewRequest = await request.json();

        if (!data.booking_id || typeof data.booking_id !== 'number') {
            return NextResponse.json(
                { error: "booking_id is required and must be a number" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            // Validate booking exists and is 'completed & paid'
            const bookingQuery = `
                SELECT
                    b.id,
                    b.status,
                    b.service_type,
                    b.start_time,
                    b.walk_summary,
                    b.owner_id,
                    o.owner_name,
                    o.email,
                    COALESCE(d1.dog_name, '') as dog_name_1,
                    COALESCE(d2.dog_name, '') as dog_name_2,
                    COALESCE(d1.image_filename, '') as dog_image_1,
                    COALESCE(d2.image_filename, '') as dog_image_2
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                WHERE b.id = $1;
            `;

            const bookingResult = await client.query(bookingQuery, [data.booking_id]);

            if (bookingResult.rows.length === 0) {
                return NextResponse.json(
                    { error: "Booking not found" },
                    { status: 404 }
                );
            }

            const booking = bookingResult.rows[0];

            if (booking.status !== 'completed & paid') {
                return NextResponse.json(
                    { error: `Booking must be 'completed & paid' to request a review. Current status: '${booking.status}'` },
                    { status: 400 }
                );
            }

            // Check if review already exists for this booking
            const existingReviewQuery = `
                SELECT id, review_token, submitted_at
                FROM hunters_hounds.reviews
                WHERE booking_id = $1;
            `;
            const existingReview = await client.query(existingReviewQuery, [data.booking_id]);

            if (existingReview.rows.length > 0) {
                const review = existingReview.rows[0];
                if (review.submitted_at) {
                    return NextResponse.json(
                        { error: "A review has already been submitted for this booking" },
                        { status: 400 }
                    );
                }
                return NextResponse.json(
                    { error: "A review request has already been sent for this booking" },
                    { status: 400 }
                );
            }

            // Create review record with token
            const createReviewQuery = `
                INSERT INTO hunters_hounds.reviews (booking_id, owner_id)
                VALUES ($1, $2)
                RETURNING id, review_token;
            `;
            const reviewResult = await client.query(createReviewQuery, [data.booking_id, booking.owner_id]);
            const reviewToken = reviewResult.rows[0].review_token;

            // Build dog names and image URLs
            const dogNames = [booking.dog_name_1, booking.dog_name_2].filter(n => n).join(' & ');
            const dogImageUrls = [booking.dog_image_1, booking.dog_image_2]
                .filter(img => img)
                .map(img => `https://hunters-hounds.london/images/dogs/${img}`);

            // Format service date
            const serviceDate = format(new Date(booking.start_time), 'EEEE, MMMM d');

            // Generate and send review request email
            const reviewUrl = `https://hunters-hounds.london/review/${reviewToken}`;
            const { subject, html } = generateReviewRequestEmail({
                ownerName: booking.owner_name.split(' ')[0], // First name only
                dogNames,
                dogImageUrls,
                serviceType: booking.service_type,
                serviceDate,
                walkSummary: booking.walk_summary,
                reviewUrl
            });

            await sendBookingEmail(data.booking_id, subject, html);

            // Send Telegram notification
            try {
                const telegramMessage = `
⭐ <b>REVIEW REQUESTED</b> ⭐

<b>Customer:</b> ${booking.owner_name}
<b>Dog(s):</b> ${dogNames}
<b>Service:</b> ${booking.service_type}
<b>Date:</b> ${serviceDate}

<i>Review request email sent</i>
                `.trim();

                await sendTelegramNotification(telegramMessage);
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
                // Don't fail the operation if Telegram fails
            }

            return NextResponse.json({
                success: true,
                review_token: reviewToken,
                email_sent: true,
                message: `Review request sent to ${booking.owner_name}`
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Request review error:", error);
        return NextResponse.json(
            { error: "Failed to request review. Please try again." },
            { status: 500 }
        );
    }
}
