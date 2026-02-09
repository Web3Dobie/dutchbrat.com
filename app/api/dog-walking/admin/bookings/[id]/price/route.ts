import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { sendTelegramNotification } from "@/lib/telegram";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = getPool();

interface UpdatePriceRequest {
    price: number | null;
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const bookingId = parseInt(params.id);
        if (isNaN(bookingId)) {
            return NextResponse.json(
                { error: "Invalid booking ID" },
                { status: 400 }
            );
        }

        const data: UpdatePriceRequest = await request.json();

        // Validate price - allow null, 0, or positive numbers
        if (data.price !== null && (isNaN(data.price) || data.price < 0)) {
            return NextResponse.json(
                { error: "Price must be null or a positive number" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // First, verify booking exists and is not 'completed & paid'
            const checkQuery = `
                SELECT 
                    b.id,
                    b.status,
                    b.service_type,
                    b.price_pounds,
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
                GROUP BY b.id, b.status, b.service_type, b.price_pounds, o.owner_name;
            `;

            const checkResult = await client.query(checkQuery, [bookingId]);

            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Booking not found" },
                    { status: 404 }
                );
            }

            const booking = checkResult.rows[0];

            // Prevent editing completed & paid bookings
            if (booking.status === 'completed & paid') {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Cannot edit price for completed & paid bookings" },
                    { status: 400 }
                );
            }

            const oldPrice = booking.price_pounds;

            // Update the price
            const updateQuery = `
                UPDATE hunters_hounds.bookings 
                SET price_pounds = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND status != 'completed & paid'
                RETURNING id, price_pounds;
            `;

            const updateResult = await client.query(updateQuery, [data.price, bookingId]);

            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Failed to update price. Booking may be completed & paid." },
                    { status: 400 }
                );
            }

            await client.query('COMMIT');

            const dogNames = booking.dog_names.join(', ');
            const oldPriceStr = oldPrice ? `£${parseFloat(oldPrice).toFixed(2)}` : 'NULL';
            const newPriceStr = data.price ? `£${data.price.toFixed(2)}` : 'NULL';

            // Send Telegram notification
            try {
                const telegramMessage = `
💰 <b>PRICE UPDATED</b> 💰

<b>Booking:</b> #${bookingId}
<b>Customer:</b> ${booking.owner_name}
<b>Service:</b> ${booking.service_type} (${dogNames})

<b>Price Change:</b>
Old: ${oldPriceStr}
New: ${newPriceStr}

<i>Updated via Admin Dashboard</i>
                `.trim();

                await sendTelegramNotification(telegramMessage);
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
                // Don't fail the operation if Telegram fails
            }

            return NextResponse.json({
                success: true,
                booking_id: bookingId,
                old_price: oldPrice,
                new_price: data.price,
                message: `Price updated successfully`
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Update price error:", error);
        return NextResponse.json(
            { error: "Failed to update price. Please try again." },
            { status: 500 }
        );
    }
}