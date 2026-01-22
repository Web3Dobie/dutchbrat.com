import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { Pool } from "pg";
import { format } from "date-fns";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendEmail, sendBookingEmail } from "@/lib/emailService";
import { getServiceDisplayName } from "@/lib/serviceTypes";

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

// --- Helper Types ---
interface CancelRequest {
    bookingId?: number;           // For dashboard cancellations
    cancellation_token?: string; // For email link cancellations
}

interface BookingRow {
    id: number;
    google_event_id: string;
    start_time: string;
    end_time: string;
    service_type: string;
    owner_name: string;
    phone: string;
    email: string;
    dog_name_1: string;
    dog_name_2: string | null;
}

// --- Main POST Function ---
export async function POST(request: NextRequest) {
    const data: CancelRequest = await request.json();

    // Validate that we have either bookingId OR cancellation_token
    if (!data.bookingId && !data.cancellation_token) {
        return NextResponse.json(
            { error: "Either booking ID or cancellation token is required." },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // --- 1. Fetch Booking Details ---
        let bookingResult;

        if (data.cancellation_token) {
            // Email-based cancellation using token
            const selectByTokenQuery = `
                SELECT 
                    b.id, b.google_event_id, b.start_time, b.end_time, b.service_type,
                    o.owner_name, o.phone, o.email,
                    d1.dog_name AS dog_name_1, d2.dog_name AS dog_name_2
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                WHERE b.cancellation_token = $1 AND b.status = 'confirmed'
                FOR UPDATE OF b;
            `;
            bookingResult = await client.query(selectByTokenQuery, [data.cancellation_token]);
        } else {
            // Dashboard-based cancellation using booking ID (keep original query)
            const selectByIdQuery = `
                SELECT 
                    b.id, b.google_event_id, b.start_time, b.end_time, b.service_type,
                    o.owner_name, o.phone, o.email,
                    d1.dog_name AS dog_name_1, d2.dog_name AS dog_name_2
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                WHERE b.id = $1 AND b.status = 'confirmed'
                FOR UPDATE OF b;
            `;
            bookingResult = await client.query(selectByIdQuery, [data.bookingId]);
        }

        if (bookingResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Booking not found or already cancelled." },
                { status: 404 }
            );
        }

        // Properly type the booking result
        const booking = bookingResult.rows[0] as BookingRow;
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
        await client.query(updateQuery, [booking.id]); // Use booking.id from the fetched result

        // --- 4. Send Cancellation Email to Customer ---
        const dogNames = booking.dog_name_2
            ? `${booking.dog_name_1} & ${booking.dog_name_2}`
            : booking.dog_name_1;
        const serviceDisplayName = getServiceDisplayName(booking.service_type);

        try {
            const emailSubject = `Booking Cancelled - ${displayDate}`;
            const emailContent = `
                <h1>Booking Cancellation Confirmed</h1>
                <p>Hi ${booking.owner_name},</p>
                <p>Your booking for a <strong>${serviceDisplayName}</strong> has been successfully cancelled.</p>

                <h3>Cancelled Booking Details:</h3>
                <p><strong>Service:</strong> ${serviceDisplayName}</p>
                <p><strong>Date & Time:</strong> ${displayDate}</p>
                <p><strong>Dog(s):</strong> ${dogNames}</p>
                <p><strong>Booking ID:</strong> ${booking.id}</p>
                
                <p><strong>No charges apply.</strong> Your time slot is now available for other customers.</p>
                
                <br>
                <p>If you'd like to book another appointment, please visit our booking page.</p>
                <p><strong>Questions?</strong> Feel free to reach out at 07932749772.</p>
                
                <br>
                <p>Thank you for choosing Hunter's Hounds!</p>
                <p><em>Ernesto</em></p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <p style="color: #6b7280; font-size: 14px;">
                    <strong>Hunter's Hounds</strong><br>
                    Professional Dog Walking & Pet Care<br>
                    Phone: 07932749772<br>
                    Email: bookings@hunters-hounds.london
                </p>
            `;

            await sendBookingEmail(booking.id, emailSubject, emailContent);
            console.log(`Cancellation confirmation emails sent to all recipients for booking ${booking.id}`);
        } catch (emailError) {
            console.error(`Failed to send cancellation emails for booking ${booking.id}:`, emailError);
            // Continue with the rest of the cancellation process even if email fails
        }

        // --- 5. Send Telegram Notification ---
        const telegramMessage = `
            ❌ <b>BOOKING CANCELLED</b> ❌

            <b>Service:</b> ${serviceDisplayName}
            <b>Time:</b> ${displayDate}
            <b>Client:</b> ${booking.owner_name} (${booking.phone})
            <b>Dog(s):</b> ${dogs}
            
            <i>Slot is now free for re-booking.</i>
        `;
        await sendTelegramNotification(telegramMessage);

        await client.query("COMMIT");

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