import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { Pool } from "pg";
import { Resend } from "resend"; // <-- NEW
import { format } from "date-fns";
import { sendTelegramNotification } from "@/lib/telegram"; // <-- NEW

// --- Initialization ---

// Resend setup (uses RESEND_API_KEY from env)
const resend = new Resend(process.env.RESEND_API_KEY);

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

// --- Helper Type ---
interface BookRequest {
    ownerId: number;
    dogId1: number;
    dogId2?: number;
    serviceType: string;
    startTime: string;
    endTime: string;

    // Extra info needed for the calendar event & emails
    ownerName: string;
    dogName1: string;
    dogName2?: string;
    address: string;
    phone: string;
    email: string; // <-- NEW
}

// --- Main POST Function ---

export async function POST(request: NextRequest) {
    const data: BookRequest = await request.json();

    // Basic Validation (Check required fields)
    if (
        !data.ownerId || !data.dogId1 || !data.serviceType ||
        !data.startTime || !data.endTime || !data.ownerName ||
        !data.dogName1 || !data.address || !data.phone || !data.email
    ) {
        return NextResponse.json(
            { error: "Missing required fields for booking" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // --- 1. Save to Postgres Database (to lock the time) ---
        const insertQuery = `
      INSERT INTO hunters_hounds.bookings (
        "owner_id", "dog_id_1", "dog_id_2", "service_type", 
        "start_time", "end_time"
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING id;
    `;
        const values = [
            data.ownerId,
            data.dogId1,
            data.dogId2 || null,
            data.serviceType,
            data.startTime,
            data.endTime,
        ];

        const bookingResult = await client.query(insertQuery, values);
        const bookingId = bookingResult.rows[0].id;
        const cancellationLink = `https://dutchbrat.com/dog-walking/cancel?id=${bookingId}`;

        // --- 2. Create the Google Calendar Event ---
        const dogNames = data.dogName2
            ? `${data.dogName1} & ${data.dogName2}`
            : data.dogName1;

        const event = {
            summary: `${data.serviceType} - ${dogNames}`,
            description: `
        Owner: ${data.ownerName}
        Dog(s): ${dogNames}
        Service: ${data.serviceType}
        Address: ${data.address}
        Phone: ${data.phone}
        Email: ${data.email}
      `,
            start: { dateTime: data.startTime, timeZone: "Europe/London" },
            end: { dateTime: data.endTime, timeZone: "Europe/London" },
            // Optional: Add owner as an attendee to send a calendar invite
            attendees: [{ email: data.email }],
        };

        const calendarResponse = await calendar.events.insert({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            requestBody: event,
        });
        const calendarEventId = calendarResponse.data.id;

        // Update booking record with the Google Event ID
        await client.query(
            `UPDATE hunters_hounds.bookings SET google_event_id = $1 WHERE id = $2`,
            [calendarEventId, bookingId]
        );

        // --- 3. Send Confirmation Email (Resend) ---
        const displayDate = format(new Date(data.startTime), "EEEE, dd MMMM 'at' HH:mm");

        await resend.emails.send({
            from: 'bookings@hunters-hounds.london',
            to: data.email,
            subject: `Hunter's Hounds Booking Confirmation: ${displayDate}`,
            html: `
                <h1>Booking Confirmed!</h1>
                <p>Hi ${data.ownerName},</p>
                <p>Your booking for a <strong>${data.serviceType}</strong> is confirmed!</p>
                <p><strong>Date & Time:</strong> ${displayDate}</p>
                <p><strong>Dog(s):</strong> ${dogNames}</p>
                <p>A calendar invite has been sent to your email. Please check your spam folder if you don't see it immediately.</p>
                <br>
                
                <p>If you need to cancel this appointment, please click the button below:</p>
                <a href="${cancellationLink}" style="
                    display: inline-block;
                    padding: 10px 20px;
                    font-weight: bold;
                    color: white;
                    background-color: #ef4444; /* red-500 */
                    border-radius: 4px;
                    text-decoration: none;">
                    Cancel Booking
                </a>
                
                <br><br>
                <p><strong>Cancellation Policy:</strong> You can cancel your booking at any time with no fee. Please refer to your calendar invite or contact us directly if you prefer.</p>
                <p>Thank you!</p>
            `,
        });

        // --- 4. Send Telegram Notification (To Hunter) ---
        const telegramMessage = `
        <b>🐶 NEW BOOKING RECEIVED!</b>
        
        <b>Service:</b> ${data.serviceType}
        <b>Time:</b> ${displayDate}
        <b>Client:</b> ${data.ownerName} (${data.phone})
        <b>Dog(s):</b> ${dogNames}
        <b>Address:</b> ${data.address}
    `;
        await sendTelegramNotification(telegramMessage);


        await client.query("COMMIT");

        return NextResponse.json(
            { success: true, message: "Booking confirmed" },
            { status: 201 }
        );

    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error("Booking pipeline failed:", error);

        // Specific error handling for time conflicts
        if (error.code === "23505" && error.constraint === "bookings_start_time_key") {
            return NextResponse.json(
                { error: "This time slot was just booked by someone else. Please select a different time." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Booking failed. Please try again." },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}