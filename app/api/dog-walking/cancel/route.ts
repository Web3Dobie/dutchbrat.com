import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { Pool } from "pg";
import { format } from "date-fns";
import { sendTelegramNotification } from "@/lib/telegram";

// --- Initialization ---

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

// Google Calendar
const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar"],
});
const calendar = google.calendar({ version: "v3", auth });

// --- Helper Type (for incoming data) ---
interface CancelRequest {
    bookingId: number;
}

// --- Main POST Function ---

export async function POST(request: NextRequest) {
    const data: CancelRequest = await request.json();

    if (!data.bookingId) {
        return NextResponse.json(
            { error: "Booking ID is required for cancellation." },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN"); // Start transaction

        // --- 1. Fetch Booking Details ---
        const selectQuery = `
      SELECT 
        b.google_event_id, b.start_time, b.end_time, b.service_type,
        o.owner_name, o.phone,
        d1.dog_name AS dog_name_1, d2.dog_name AS dog_name_2
      FROM hunters_hounds.bookings b
      JOIN hunters_hounds.owners o ON b.owner_id = o.id
      JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
      LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
      WHERE b.id = $1 AND b.status = 'active'
      FOR UPDATE; -- Lock the row to prevent double-cancellation
    `;

        const bookingResult = await client.query(selectQuery, [data.bookingId]);

        if (bookingResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Booking not found or already cancelled." },
                { status: 404 }
            );
        }

        const booking = bookingResult.rows[0];
        const dogs = booking.dog_name_2 ? `${booking.dog_name_1} & ${booking.dog_name_2}` : booking.dog_name_1;
        const displayDate = format(new Date(booking.start_time), "EEEE, dd MMMM 'at' HH:mm");

        // --- 2. Delete Google Calendar Event ---
        if (booking.google_event_id) {
            await calendar.events.delete({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                eventId: booking.google_event_id,
            });
        }

        // --- 3. Update Database Status ---
        const updateQuery = `
      UPDATE hunters_hounds.bookings
      SET status = 'cancelled'
      WHERE id = $1;
    `;
        await client.query(updateQuery, [data.bookingId]);

        // --- 4. Send Telegram Notification ---
        const telegramMessage = `
        ❌ <b>BOOKING CANCELLED</b> ❌
        
        <b>Service:</b> ${booking.service_type}
        <b>Time:</b> ${displayDate}
        <b>Client:</b> ${booking.owner_name} (${booking.phone})
        <b>Dog(s):</b> ${dogs}
        
        <i>Slot is now free for re-booking.</i>
    `;
        await sendTelegramNotification(telegramMessage);

        await client.query("COMMIT"); // Commit both DB update and event deletion

        return NextResponse.json(
            { success: true, message: "Booking successfully cancelled." },
            { status: 200 }
        );

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Cancellation pipeline failed:", error);

        return NextResponse.json(
            { error: "Cancellation failed due to a server error." },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}