import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { Pool } from "pg";
import { format } from "date-fns";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendBookingEmail } from "@/lib/emailService";
import { getServiceDisplayName } from "@/lib/serviceTypes";

// --- Database Connection ---
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

// --- Google Calendar Setup ---
const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar"],
});
const calendar = google.calendar({ version: "v3", auth });

interface RouteParams {
    params: Promise<{
        seriesId: string;
    }>;
}

interface CancelRequest {
    cancel_type: 'single' | 'series' | 'future';
    booking_id?: number; // Required for 'single' and 'future'
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const { seriesId } = await params;
    const seriesIdNum = parseInt(seriesId);

    if (isNaN(seriesIdNum)) {
        return NextResponse.json(
            { error: "Invalid series ID" },
            { status: 400 }
        );
    }

    const body: CancelRequest = await request.json();
    const { cancel_type, booking_id } = body;

    if (!cancel_type || !['single', 'series', 'future'].includes(cancel_type)) {
        return NextResponse.json(
            { error: "Invalid cancel_type. Must be 'single', 'series', or 'future'" },
            { status: 400 }
        );
    }

    if ((cancel_type === 'single' || cancel_type === 'future') && !booking_id) {
        return NextResponse.json(
            { error: "booking_id required for single and future cancellation" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verify series exists and get details
        const seriesResult = await client.query(
            `SELECT bs.*, o.owner_name, o.email, d1.dog_name AS dog_name_1, d2.dog_name AS dog_name_2
             FROM hunters_hounds.booking_series bs
             JOIN hunters_hounds.owners o ON bs.owner_id = o.id
             JOIN hunters_hounds.dogs d1 ON bs.dog_id_1 = d1.id
             LEFT JOIN hunters_hounds.dogs d2 ON bs.dog_id_2 = d2.id
             WHERE bs.id = $1`,
            [seriesIdNum]
        );

        if (seriesResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: "Series not found" }, { status: 404 });
        }

        const series = seriesResult.rows[0];
        const dogNames = series.dog_name_2
            ? `${series.dog_name_1} & ${series.dog_name_2}`
            : series.dog_name_1;

        let bookingsToCancel: Array<{
            id: number;
            google_event_id: string;
            start_time: Date;
            series_index: number;
        }> = [];

        if (cancel_type === 'single') {
            // Cancel just one booking
            const bookingResult = await client.query(
                `SELECT id, google_event_id, start_time, series_index
                 FROM hunters_hounds.bookings
                 WHERE id = $1 AND series_id = $2 AND status = 'confirmed'
                 FOR UPDATE`,
                [booking_id, seriesIdNum]
            );

            if (bookingResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Booking not found or already cancelled" },
                    { status: 404 }
                );
            }

            bookingsToCancel = bookingResult.rows;

        } else if (cancel_type === 'series') {
            // Cancel all remaining confirmed bookings in the series
            const bookingsResult = await client.query(
                `SELECT id, google_event_id, start_time, series_index
                 FROM hunters_hounds.bookings
                 WHERE series_id = $1 AND status = 'confirmed'
                 ORDER BY series_index
                 FOR UPDATE`,
                [seriesIdNum]
            );

            bookingsToCancel = bookingsResult.rows;

        } else if (cancel_type === 'future') {
            // Cancel this booking and all future bookings in the series
            const targetBookingResult = await client.query(
                `SELECT series_index FROM hunters_hounds.bookings WHERE id = $1 AND series_id = $2`,
                [booking_id, seriesIdNum]
            );

            if (targetBookingResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: "Booking not found" }, { status: 404 });
            }

            const targetIndex = targetBookingResult.rows[0].series_index;

            const bookingsResult = await client.query(
                `SELECT id, google_event_id, start_time, series_index
                 FROM hunters_hounds.bookings
                 WHERE series_id = $1 AND series_index >= $2 AND status = 'confirmed'
                 ORDER BY series_index
                 FOR UPDATE`,
                [seriesIdNum, targetIndex]
            );

            bookingsToCancel = bookingsResult.rows;
        }

        if (bookingsToCancel.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "No bookings to cancel" },
                { status: 400 }
            );
        }

        // Cancel each booking
        const cancelledIds: number[] = [];
        for (const booking of bookingsToCancel) {
            // Delete Google Calendar event
            if (booking.google_event_id) {
                try {
                    await calendar.events.delete({
                        calendarId: process.env.GOOGLE_CALENDAR_ID,
                        eventId: booking.google_event_id,
                    });
                } catch (calendarError) {
                    console.error(`Failed to delete calendar event ${booking.google_event_id}:`, calendarError);
                }
            }

            // Update booking status
            await client.query(
                `UPDATE hunters_hounds.bookings SET status = 'cancelled' WHERE id = $1`,
                [booking.id]
            );

            cancelledIds.push(booking.id);
        }

        // Update series status if all bookings are cancelled
        if (cancel_type === 'series') {
            await client.query(
                `UPDATE hunters_hounds.booking_series SET status = 'cancelled' WHERE id = $1`,
                [seriesIdNum]
            );
        } else {
            // Check if any confirmed bookings remain
            const remainingResult = await client.query(
                `SELECT COUNT(*) as count FROM hunters_hounds.bookings
                 WHERE series_id = $1 AND status = 'confirmed'`,
                [seriesIdNum]
            );

            if (parseInt(remainingResult.rows[0].count) === 0) {
                // No more confirmed bookings - mark series as completed or cancelled
                const completedResult = await client.query(
                    `SELECT COUNT(*) as count FROM hunters_hounds.bookings
                     WHERE series_id = $1 AND status = 'completed'`,
                    [seriesIdNum]
                );

                const hasCompleted = parseInt(completedResult.rows[0].count) > 0;
                await client.query(
                    `UPDATE hunters_hounds.booking_series SET status = $1 WHERE id = $2`,
                    [hasCompleted ? 'completed' : 'cancelled', seriesIdNum]
                );
            }
        }

        await client.query('COMMIT');

        // Send cancellation email
        const displayDate = cancel_type === 'single'
            ? format(new Date(bookingsToCancel[0].start_time), "EEEE, d MMMM 'at' HH:mm")
            : `${bookingsToCancel.length} appointments`;

        const cancelTypeLabel = cancel_type === 'single'
            ? 'Single Booking'
            : cancel_type === 'series'
                ? 'Entire Series'
                : 'This & Future Bookings';

        try {
            const emailSubject = cancel_type === 'single'
                ? `Booking Cancelled - ${displayDate}`
                : `Recurring Booking Series Cancelled - ${bookingsToCancel.length} appointments`;

            const emailContent = `
                <h1>Booking Cancellation Confirmed</h1>
                <p>Hi ${series.owner_name},</p>
                <p>Your cancellation request has been processed.</p>

                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #1f2937;">Cancellation Details</h3>
                    <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${getServiceDisplayName(series.service_type)}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Dog(s):</strong> ${dogNames}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Cancellation Type:</strong> ${cancelTypeLabel}</p>
                    <p style="margin: 0;"><strong>Bookings Cancelled:</strong> ${bookingsToCancel.length}</p>
                </div>

                ${cancel_type === 'single' ? `
                    <p><strong>Cancelled Date:</strong> ${displayDate}</p>
                ` : `
                    <p><strong>Cancelled Dates:</strong></p>
                    <ul>
                        ${bookingsToCancel.map(b =>
                            `<li>${format(new Date(b.start_time), "EEE d MMM 'at' HH:mm")}</li>`
                        ).join('')}
                    </ul>
                `}

                <p style="margin-top: 20px;"><strong>No charges apply.</strong> Your time slots are now available for other customers.</p>

                <p style="margin-top: 30px;">
                    If you'd like to book another service, please visit
                    <a href="https://hunters-hounds.com/my-account" style="color: #3b82f6;">your dashboard</a>.
                </p>

                <br>
                <p>Thank you for choosing Hunter's Hounds!</p>
                <p><em>Ernesto</em></p>
            `;

            // Send to first cancelled booking (they all have same owner)
            await sendBookingEmail(cancelledIds[0], emailSubject, emailContent);
        } catch (emailError) {
            console.error("Failed to send cancellation email:", emailError);
        }

        // Send Telegram notification
        const telegramMessage = `
❌ <b>RECURRING BOOKING CANCELLED</b>

📋 <b>Series #${seriesIdNum}</b>
🔄 <b>Type:</b> ${cancelTypeLabel}
📅 <b>Cancelled:</b> ${bookingsToCancel.length} booking${bookingsToCancel.length > 1 ? 's' : ''}
👤 ${series.owner_name}
🐾 ${dogNames}

<i>Slots are now free for re-booking.</i>
        `;

        try {
            await sendTelegramNotification(telegramMessage);
        } catch (telegramError) {
            console.error("Failed to send Telegram notification:", telegramError);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully cancelled ${bookingsToCancel.length} booking(s)`,
            cancelled_bookings: cancelledIds,
            cancel_type,
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error cancelling recurring booking:", error);
        return NextResponse.json(
            { error: "Failed to cancel booking" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
