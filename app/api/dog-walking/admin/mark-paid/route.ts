import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { sendTelegramNotification } from "@/lib/telegram";

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
                    o.owner_name,
                    array_agg(
                        CASE 
                            WHEN d1.id IS NOT NULL THEN d1.dog_name
                            WHEN d2.id IS NOT NULL THEN d2.dog_name
                            ELSE NULL
                        END
                    ) FILTER (WHERE d1.id IS NOT NULL OR d2.id IS NOT NULL) as dog_names
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                WHERE b.id = ANY($1)
                GROUP BY b.id, b.status, b.service_type, b.price_pounds, b.start_time, o.owner_name;
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

            // Send Telegram notification
            try {
                const bookingDetails = validateResult.rows.map(booking => {
                    const dogNames = booking.dog_names.join(', ');
                    const price = booking.price_pounds ? `£${parseFloat(booking.price_pounds).toFixed(2)}` : 'FREE';
                    return `#${booking.id}: ${booking.owner_name} - ${booking.service_type} (${dogNames}) - ${price}`;
                }).join('\n');

                const telegramMessage = `
💰 <b>PAYMENTS RECEIVED</b> 💰

<b>Marked as Paid:</b> ${updatedCount} booking(s)

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