import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { sendTelegramNotification } from "@/lib/telegram";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = getPool();

interface UpdateSummaryRequest {
    booking_id: number;
    walk_summary: string;
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data: UpdateSummaryRequest = await request.json();

        if (!data.booking_id || typeof data.walk_summary !== 'string') {
            return NextResponse.json(
                { error: "booking_id (number) and walk_summary (string) are required" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // First, validate that the booking exists and is completed
            const validateQuery = `
                SELECT 
                    b.id,
                    b.status,
                    b.service_type,
                    b.walk_summary as current_summary,
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
                WHERE b.id = $1
                GROUP BY b.id, b.status, b.service_type, b.walk_summary, o.owner_name;
            `;

            const validateResult = await client.query(validateQuery, [data.booking_id]);

            if (validateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Booking not found" },
                    { status: 404 }
                );
            }

            const booking = validateResult.rows[0];

            // Check if booking is in a valid status for summary updates
            if (!['completed', 'completed & paid'].includes(booking.status)) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: `Cannot add summary to booking in '${booking.status}' status. Booking must be completed.` },
                    { status: 400 }
                );
            }

            // Update the walk summary
            const updateQuery = `
                UPDATE hunters_hounds.bookings 
                SET walk_summary = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, walk_summary;
            `;

            const updateResult = await client.query(updateQuery, [data.booking_id, data.walk_summary]);

            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Failed to update walk summary" },
                    { status: 500 }
                );
            }

            await client.query('COMMIT');

            // Send Telegram notification for summary updates
            try {
                const dogNames = booking.dog_names.join(', ');
                const action = booking.current_summary ? 'UPDATED' : 'ADDED';
                
                const telegramMessage = `
📝 <b>WALK SUMMARY ${action}</b> 📝

<b>Booking #${booking.id}:</b> ${booking.owner_name} - ${booking.service_type}
<b>Dogs:</b> ${dogNames}

<b>Summary:</b>
${data.walk_summary}

<i>Summary ${action.toLowerCase()} for completed service</i>
                `.trim();

                await sendTelegramNotification(telegramMessage);
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
                // Don't fail the operation if Telegram fails
            }

            return NextResponse.json({
                success: true,
                booking_id: data.booking_id,
                walk_summary: data.walk_summary,
                message: `Walk summary ${booking.current_summary ? 'updated' : 'added'} successfully`
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Update summary error:", error);
        return NextResponse.json(
            { error: "Failed to update walk summary. Please try again." },
            { status: 500 }
        );
    }
}