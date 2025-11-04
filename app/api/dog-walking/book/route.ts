// Enhanced booking API route with multi-day support
// This is the modifications needed for /app/api/dog-walking/book/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { format, differenceInDays } from "date-fns";
import { Pool } from "pg";
import { Resend } from "resend";

// --- Database Connection ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// --- Google Calendar Setup ---
const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar"],
});
const calendar = google.calendar({ version: "v3", auth });

// --- Email Service ---
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("Booking request body:", body);
        const {
            ownerId, // <-- CHANGED: From owner_id to ownerId
            dog_id_1,
            dog_id_2,
            service_type,
            start_time,
            end_time, // NEW: for multi-day bookings
            duration_minutes, // For single-day bookings
            owner_name,
            phone,
            email,
            address,
            dog_name_1,
            dog_name_2
        } = body;

        // Determine booking type based on presence of end_time and duration
        const booking_type = end_time && !duration_minutes ? 'multi_day' : 'single';

        // Validate multi-day booking logic
        if (service_type === 'Dog Sitting' && booking_type !== 'multi_day') {
            // Handle single-day sitting requests if needed, but for now, enforce duration for single day walks
            if (booking_type === 'single') {
                // No action, rely on duration_minutes for single day walk logic below
            } else {
                return NextResponse.json(
                    { error: "Dog Sitting must be booked with an end time (multi-day flow)" },
                    { status: 400 }
                );
            }
        }

        if (booking_type === 'multi_day' && service_type !== 'Dog Sitting') {
            // Use `service_type` property if Dog Sitting is not found (assuming Dog Sitting name is 'Dog Sitting')
            if (service_type.toLowerCase().includes('walk') || service_type.toLowerCase().includes('greet')) {
                return NextResponse.json(
                    { error: `Multi-day bookings are only available for Dog Sitting. Service received: ${service_type}` },
                    { status: 400 }
                );
            }
        }


        // Generate cancellation token
        const cancellation_token = crypto.randomUUID();

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // --- 1. Insert Booking Record ---
            const insertBookingQuery = `
                INSERT INTO hunters_hounds.bookings 
                (owner_id, dog_id_1, dog_id_2, service_type, start_time, end_time, duration_minutes, booking_type, cancellation_token, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active') 
                RETURNING id
            `;

            // Calculate end_time for single bookings
            let calculatedEndTime;
            if (booking_type === 'single' && duration_minutes) {
                // Calculate end_time = start_time + duration_minutes
                const startDateTime = new Date(start_time);
                const endDateTime = new Date(startDateTime.getTime() + (duration_minutes * 60 * 1000));
                calculatedEndTime = endDateTime.toISOString();
            } else {
                // Multi-day booking uses the provided end_time
                calculatedEndTime = end_time;
            }

            const bookingValues = [
                ownerId,
                dog_id_1,
                dog_id_2 || null,
                service_type,
                start_time,
                calculatedEndTime, // ✅ Always provides a valid end_time
                booking_type === 'single' ? duration_minutes : null,
                booking_type,
                cancellation_token
            ];

            const bookingResult = await client.query(insertBookingQuery, bookingValues);
            const bookingId = bookingResult.rows[0].id;

            // --- 2. Create Google Calendar Event ---
            const dogNames = dog_name_2 ? `${dog_name_1} & ${dog_name_2}` : dog_name_1;

            let eventTitle, eventDescription;

            if (booking_type === 'multi_day') {
                const numDays = differenceInDays(new Date(end_time), new Date(start_time)) + 1;
                eventTitle = `${service_type} - ${dogNames} (${numDays} days)`;
                eventDescription = `
Multi-Day Dog Sitting
Owner: ${owner_name}
Dog(s): ${dogNames}
Duration: ${numDays} days
Address: ${address}
Phone: ${phone}
Email: ${email}
Start: ${format(new Date(start_time), "EEEE, MMMM d 'at' HH:mm")}
End: ${format(new Date(end_time), "EEEE, MMMM d 'at' HH:mm")}
Booking Type: Multi-Day
                `;
            } else {
                eventTitle = `${service_type} - ${dogNames}`;

                // Calculate end time for single day walks/greets for event
                const walkEndTime = new Date(new Date(start_time).getTime() + (duration_minutes || 0) * 60000).toISOString();

                eventDescription = `
Owner: ${owner_name}
Dog(s): ${dogNames}
Service: ${service_type}
Duration: ${duration_minutes} minutes
Address: ${address}
Phone: ${phone}
Email: ${email}
Booking Type: Single Day
Start: ${format(new Date(start_time), "EEEE, MMMM d 'at' HH:mm")}
End: ${format(new Date(walkEndTime), "EEEE, MMMM d 'at' HH:mm")}
                `;
            }

            const event = {
                summary: eventTitle,
                description: eventDescription,
                start: {
                    dateTime: start_time,
                    timeZone: "Europe/London"
                },
                end: {
                    // Use end_time for multi-day, calculate end time using duration for single day
                    dateTime: booking_type === 'multi_day' ? end_time : new Date(new Date(start_time).getTime() + (duration_minutes || 0) * 60000).toISOString(),
                    timeZone: "Europe/London"
                },
            };

            const calendarResponse = await calendar.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                requestBody: event,
            });

            const googleEventId = calendarResponse.data.id;

            // Update booking with Google Event ID
            await client.query(
                `UPDATE hunters_hounds.bookings SET google_event_id = $1 WHERE id = $2`,
                [googleEventId, bookingId]
            );

            // --- 3. Send Confirmation Email ---
            const cancellationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/cancel?token=${cancellation_token}`;
            const dashboardLink = `${process.env.NEXT_PUBLIC_BASE_URL}/dog-walking/dashboard`;

            let emailSubject, emailContent;

            if (booking_type === 'multi_day') {
                const numDays = differenceInDays(new Date(end_time), new Date(start_time)) + 1;
                emailSubject = `Hunter's Hounds Multi-Day Dog Sitting Confirmed: ${numDays} days`;
                emailContent = `
                    <h1>Multi-Day Dog Sitting Confirmed!</h1>
                    <p>Hi ${owner_name},</p>
                    <p>Your <strong>${numDays}-day dog sitting booking</strong> is confirmed!</p>
                    <p><strong>Start:</strong> ${format(new Date(start_time), "EEEE, MMMM d 'at' HH:mm")}</p>
                    <p><strong>End:</strong> ${format(new Date(end_time), "EEEE, MMMM d 'at' HH:mm")}</p>
                    <p><strong>Dog(s):</strong> ${dogNames}</p>
                    <p><strong>Duration:</strong> ${numDays} days</p>
                    <br>
                    <p>This is a multi-day booking where I'll be providing continuous care for your dog(s). We'll discuss the specific arrangements and pricing (POA) before the start date.</p>
                    <br>
                    <p>Please save this confirmation email for your records. I'll be in touch closer to the start date to coordinate details.</p>
                    <br>
                    
                    <!-- NEW: Dashboard link for multi-day -->
                    <p><strong>Manage Your Booking:</strong></p>
                    <a href="${dashboardLink}" style="
                        display: inline-block;
                        padding: 10px 20px;
                        font-weight: bold;
                        color: white;
                        background-color: #3b82f6;
                        border-radius: 4px;
                        text-decoration: none;
                        margin-right: 10px;
                        margin-bottom: 10px;">
                        View Dashboard
                    </a>
                    
                    <p>If you need to cancel this appointment, please click the button below:</p>
                    <a href="${cancellationLink}" style="
                        display: inline-block;
                        padding: 10px 20px;
                        font-weight: bold;
                        color: white;
                        background-color: #ef4444;
                        border-radius: 4px;
                        text-decoration: none;">
                        Cancel Booking
                    </a>
                    <br><br>
                    <p><strong>Cancellation Policy:</strong> You can cancel your booking at any time with no fee. For multi-day bookings, please provide as much notice as possible.</p>
                    <p>Thank you!</p>
                `;
            } else {
                const displayDate = format(new Date(start_time), "EEEE, dd MMMM 'at' HH:mm");
                emailSubject = `Hunter's Hounds Booking Confirmation: ${displayDate}`;
                emailContent = `
                    <h1>Booking Confirmed!</h1>
                    <p>Hi ${owner_name},</p>
                    <p>Your booking for a <strong>${service_type}</strong> is confirmed!</p>
                    <p><strong>Date & Time:</strong> ${displayDate}</p>
                    <p><strong>Dog(s):</strong> ${dogNames}</p>
                    <p><strong>Duration:</strong> ${duration_minutes} minutes</p>
                    <p>Please save this confirmation email for your records. We'll see you at the scheduled time!</p>
                    <br>
                    
                    <!-- NEW: Dashboard link for single bookings -->
                    <p><strong>Manage Your Booking:</strong></p>
                    <a href="${dashboardLink}" style="
                        display: inline-block;
                        padding: 10px 20px;
                        font-weight: bold;
                        color: white;
                        background-color: #3b82f6;
                        border-radius: 4px;
                        text-decoration: none;
                        margin-right: 10px;
                        margin-bottom: 10px;">
                        View Dashboard
                    </a>
                    
                    <p>If you need to cancel this appointment, please click the button below:</p>
                    <a href="${cancellationLink}" style="
                        display: inline-block;
                        padding: 10px 20px;
                        font-weight: bold;
                        color: white;
                        background-color: #ef4444;
                        border-radius: 4px;
                        text-decoration: none;">
                        Cancel Booking
                    </a>
                    <br><br>
                    <p><strong>Cancellation Policy:</strong> You can cancel your booking at any time with no fee. Please contact us at 07932749772 or use the cancellation link above.</p>
                    <p>Thank you!</p>
                `;
            }

            // --- 3.1 Send Actual Confirmation Email ---
            try {
                await resend.emails.send({
                    from: "Hunter's Hounds <bookings@hunters-hounds.london>",
                    to: [email],
                    subject: emailSubject,
                    html: emailContent,
                });
                console.log("Confirmation email sent successfully to:", email);
            } catch (emailError) {
                console.error("Failed to send confirmation email:", emailError);
                // Don't fail the booking if email fails - continue with Telegram
            }

            // --- 4. Send Telegram Notification ---
            let telegramMessage;

            if (booking_type === 'multi_day') {
                const numDays = differenceInDays(new Date(end_time), new Date(start_time)) + 1;
                telegramMessage = `
🐕 NEW MULTI-DAY DOG SITTING BOOKING

📅 ${numDays} days: ${format(new Date(start_time), "MMM d HH:mm")} → ${format(new Date(end_time), "MMM d HH:mm")}
👤 ${owner_name} (${phone})
🐾 ${dogNames}
📍 ${address}
📧 ${email}
                `;
            } else {
                telegramMessage = `
🐕 NEW BOOKING: ${service_type.toUpperCase()}

📅 ${format(new Date(start_time), "EEE, MMM d 'at' HH:mm")}
👤 ${owner_name} (${phone})
🐾 ${dogNames}
⏱️ ${duration_minutes} minutes
📍 ${address}
📧 ${email}
                `;
            }

            if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: process.env.TELEGRAM_CHAT_ID,
                        text: telegramMessage,
                        parse_mode: 'HTML'
                    })
                });
            }

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                booking_id: bookingId,
                google_event_id: googleEventId,
                cancellation_token: cancellation_token,
                booking_type: booking_type,
                message: booking_type === 'multi_day'
                    ? "Multi-day dog sitting booking confirmed!"
                    : "Single-day booking confirmed!"
            });

        } catch (error) {
            await client.query('ROLLBACK');

            // Log the error detail for debugging
            console.error("Error creating booking:", error);

            return NextResponse.json(
                { error: "Error creating booking. Please check console for details." },
                { status: 500 }
            );
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Error parsing request body or general server failure:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 400 }
        );
    }
}
