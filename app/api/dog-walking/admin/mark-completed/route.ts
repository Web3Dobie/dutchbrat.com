import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { sendTelegramNotification } from "@/lib/telegram";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = getPool();

interface MarkCompletedRequest {
    booking_ids: number[];
    walk_summary?: string; // Optional summary when marking as completed
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data: MarkCompletedRequest = await request.json();

        if (!data.booking_ids || !Array.isArray(data.booking_ids) || data.booking_ids.length === 0) {
            return NextResponse.json(
                { error: "booking_ids array is required" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // First, validate that all bookings exist and are in 'confirmed' status
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

            // Check if all bookings are in 'confirmed' status
            const invalidBookings = validateResult.rows.filter(booking => booking.status !== 'confirmed');
            if (invalidBookings.length > 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: `Cannot mark as completed. Some bookings are not in 'confirmed' status: ${invalidBookings.map(b => `#${b.id} (${b.status})`).join(', ')}` },
                    { status: 400 }
                );
            }

            // Auto-amalgamate ad-hoc notes into walk_summary if no explicit summary provided
            let finalSummary = data.walk_summary;
            if (!finalSummary) {
                // For each booking, check for ad-hoc notes to amalgamate
                // (typically only one booking at a time, but handle array)
                for (const bookingId of data.booking_ids) {
                    const notesResult = await client.query(
                        `SELECT note_text, note_date
                         FROM hunters_hounds.booking_notes
                         WHERE booking_id = $1
                         ORDER BY note_date ASC, created_at ASC`,
                        [bookingId]
                    );

                    if (notesResult.rows.length > 0) {
                        finalSummary = notesResult.rows.map((note: { note_text: string; note_date: string }, index: number) => {
                            const dateStr = new Date(note.note_date).toLocaleDateString('en-GB', {
                                weekday: 'short', day: 'numeric', month: 'short'
                            });
                            return `Day ${index + 1} (${dateStr}): ${note.note_text}`;
                        }).join('\n\n');
                        break; // Use notes from the first booking that has them
                    }
                }
            }

            // Update bookings to 'completed' with optional walk summary
            const updateQuery = finalSummary
                ? `UPDATE hunters_hounds.bookings
                   SET status = 'completed', walk_summary = $2, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ANY($1) AND status = 'confirmed'
                   RETURNING id;`
                : `UPDATE hunters_hounds.bookings
                   SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                   WHERE id = ANY($1) AND status = 'confirmed'
                   RETURNING id;`;

            const updateParams = finalSummary
                ? [data.booking_ids, finalSummary]
                : [data.booking_ids];

            const updateResult = await client.query(updateQuery, updateParams);
            const updatedCount = updateResult.rows.length;

            if (updatedCount === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "No bookings were updated. They may already be completed or in incorrect status." },
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

                let telegramMessage = `
✅ <b>SERVICES COMPLETED</b> ✅

<b>Marked as Completed:</b> ${updatedCount} booking(s)

${bookingDetails}

<i>Status updated to 'completed' (awaiting payment)</i>`;

                // Add walk summary to notification if provided
                if (finalSummary) {
                    telegramMessage += `\n\n📝 <b>Walk Summary:</b>\n${finalSummary}`;
                }

                await sendTelegramNotification(telegramMessage.trim());
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
                // Don't fail the operation if Telegram fails
            }

            return NextResponse.json({
                success: true,
                updated_count: updatedCount,
                message: `${updatedCount} booking(s) marked as completed${finalSummary ? ' with summary' : ''}`
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Mark completed error:", error);
        return NextResponse.json(
            { error: "Failed to mark bookings as completed. Please try again." },
            { status: 500 }
        );
    }
}