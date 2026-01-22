import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { google } from "googleapis";
import { sendEmail } from "@/lib/emailService";
import { format } from "date-fns";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendBookingEmail } from "@/lib/emailService";
import { getServiceDisplayName } from "@/lib/serviceTypes";

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

interface RescheduleRequest {
    booking_id: number;
    new_start_time: string; // ISO string
    new_end_time: string;   // ISO string
}

export async function POST(request: NextRequest) {
    const data: RescheduleRequest = await request.json();

    // Validation
    if (!data.booking_id || !data.new_start_time || !data.new_end_time) {
        return NextResponse.json(
            { error: "booking_id, new_start_time, and new_end_time are required" },
            { status: 400 }
        );
    }

    // Validate dates
    const newStartTime = new Date(data.new_start_time);
    const newEndTime = new Date(data.new_end_time);
    const now = new Date();

    if (isNaN(newStartTime.getTime()) || isNaN(newEndTime.getTime())) {
        return NextResponse.json(
            { error: "Invalid date format provided" },
            { status: 400 }
        );
    }

    if (newStartTime < now) {
        return NextResponse.json(
            { error: "Cannot reschedule to a time in the past" },
            { status: 400 }
        );
    }

    if (newEndTime <= newStartTime) {
        return NextResponse.json(
            { error: "End time must be after start time" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // First, fetch the current booking details
        const bookingQuery = `
            SELECT 
                b.id,
                b.service_type,
                b.start_time as old_start_time,
                b.end_time as old_end_time,
                b.duration_minutes,
                b.status,
                b.price_pounds,
                b.google_event_id,
                o.owner_name,
                o.phone,
                o.email,
                o.address,
                -- Get dog names
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
            WHERE b.id = $1 AND b.status = 'confirmed'
            GROUP BY b.id, b.service_type, b.start_time, b.end_time, b.duration_minutes, 
                     b.status, b.price_pounds, b.google_event_id, o.owner_name, o.phone, o.email, o.address;
        `;

        const bookingResult = await client.query(bookingQuery, [data.booking_id]);

        if (bookingResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Booking not found or not available for rescheduling" },
                { status: 404 }
            );
        }

        const booking = bookingResult.rows[0];

        // Check for time conflicts with OTHER bookings (explicitly exclude the booking being rescheduled)
        // Also exclude long dog sittings (6+ hours) which can coexist with walks (per V11.1)
        const bookingIdNum = parseInt(String(data.booking_id));

        console.log(`Reschedule check: booking_id=${bookingIdNum}, new_start=${data.new_start_time}, new_end=${data.new_end_time}`);

        const conflictQuery = `
            SELECT id, start_time, end_time, service_type, duration_minutes FROM hunters_hounds.bookings
            WHERE id != $1
            AND status = 'confirmed'
            AND (
                (start_time <= $2 AND end_time > $2) OR
                (start_time < $3 AND end_time >= $3) OR
                (start_time >= $2 AND end_time <= $3)
            );
        `;

        const conflictResult = await client.query(conflictQuery, [
            bookingIdNum,
            data.new_start_time,
            data.new_end_time
        ]);

        // Filter out conflicts that don't actually block this booking:
        // 1. The booking being rescheduled (shouldn't happen due to SQL, but double-check)
        // 2. Long dog sittings (6+ hours) - walks can coexist with these (V11.1)
        // 3. Multi-day dog sittings - walks can coexist with these
        const actualConflicts = conflictResult.rows.filter(row => {
            // Exclude the booking being rescheduled
            if (Number(row.id) === bookingIdNum) return false;

            // Check if this is a dog sitting that allows walk coexistence
            const serviceType = (row.service_type || '').toLowerCase();
            const isSitting = serviceType.includes('sitting');

            if (isSitting) {
                // Calculate duration in hours
                const startTime = new Date(row.start_time);
                const endTime = new Date(row.end_time);
                const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

                // Long sittings (6+ hours) don't block walks
                if (durationHours >= 6) {
                    console.log(`Allowing coexistence: booking ${row.id} is a ${durationHours}h sitting, walks can coexist`);
                    return false;
                }
            }

            return true; // This is a real conflict
        });

        if (actualConflicts.length > 0) {
            console.log(`Reschedule conflict found: booking ${bookingIdNum} conflicts with bookings:`,
                actualConflicts.map(r => `id=${r.id} (${r.start_time} - ${r.end_time})`).join(', '));
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "The requested time slot conflicts with another booking" },
                { status: 409 }
            );
        }

        console.log(`Reschedule check passed: no conflicts found for booking ${bookingIdNum}`);

        // Calculate new duration (in case it's different)
        const newDurationMinutes = Math.round((newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60));

        // 1. Update booking in database (removed updated_at reference)
        const updateQuery = `
            UPDATE hunters_hounds.bookings 
            SET 
                start_time = $2,
                end_time = $3,
                duration_minutes = $4
            WHERE id = $1;
        `;

        await client.query(updateQuery, [
            data.booking_id,
            data.new_start_time,
            data.new_end_time,
            newDurationMinutes
        ]);

        // 2. Update Google Calendar event
        const serviceDisplayName = getServiceDisplayName(booking.service_type);
        const dogNames = booking.dog_names?.join(" & ") || "dogs";

        if (booking.google_event_id) {
            try {
                await calendar.events.update({
                    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
                    eventId: booking.google_event_id,
                    requestBody: {
                        summary: `${serviceDisplayName} - ${booking.owner_name}`,
                        description: `
Customer: ${booking.owner_name}
Phone: ${booking.phone}
Address: ${booking.address}
Dogs: ${dogNames}
Service: ${serviceDisplayName}
${booking.price_pounds ? `Price: £${parseFloat(booking.price_pounds).toFixed(2)}` : ''}

** RESCHEDULED FROM ${format(new Date(booking.old_start_time), "MMM d, yyyy 'at' h:mm a")} **
                        `.trim(),
                        start: {
                            dateTime: newStartTime.toISOString(),
                            timeZone: "Europe/London",
                        },
                        end: {
                            dateTime: newEndTime.toISOString(),
                            timeZone: "Europe/London",
                        },
                        location: booking.address,
                    },
                });
                console.log("Google Calendar event updated:", booking.google_event_id);
            } catch (calendarError) {
                console.error("Failed to update calendar event:", calendarError);
                // Don't fail the whole operation if calendar update fails
            }
        }

        // 3. Send reschedule confirmation email using new email service
        const oldFormattedDate = format(new Date(booking.old_start_time), "EEEE, MMMM d, yyyy");
        const oldFormattedTime = format(new Date(booking.old_start_time), "h:mm a");
        const newFormattedDate = format(newStartTime, "EEEE, MMMM d, yyyy");
        const newFormattedTime = format(newStartTime, "h:mm a");

        try {
            const emailSubject = `Booking Rescheduled - ${serviceDisplayName}`;
            const emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #059669;">Booking Rescheduled</h2>
                    
                    <p>Dear ${booking.owner_name},</p>
                    
                    <p>Your booking has been successfully rescheduled:</p>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #374151;">Updated Booking Details</h3>
                        <p><strong>Service:</strong> ${serviceDisplayName}</p>
                        <p><strong>New Date:</strong> ${newFormattedDate}</p>
                        <p><strong>New Time:</strong> ${newFormattedTime}</p>
                        <p><strong>Dogs:</strong> ${dogNames}</p>
                        ${booking.price_pounds ? `<p><strong>Price:</strong> £${parseFloat(booking.price_pounds).toFixed(2)}</p>` : ''}
                    </div>
                    
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0; color: #92400e;"><strong>Previous booking time:</strong> ${oldFormattedDate} at ${oldFormattedTime}</p>
                    </div>
                    
                    <p>Please make note of the new date and time. We look forward to seeing you and ${dogNames}!</p>
                    
                    <p>If you need to make any further changes, please contact us as soon as possible.</p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                    
                    <p style="color: #6b7280; font-size: 14px;">
                        <strong>Hunter's Hounds</strong><br>
                        Professional Dog Walking Service<br>
                        Phone: 07932749772<br>
                        Email: bookings@hunters-hounds.london
                    </p>
                </div>
            `;

            await sendBookingEmail(booking.id, emailSubject, emailContent);
            console.log(`Reschedule confirmation emails sent to all recipients for booking ${booking.id}`);
        } catch (emailError) {
            console.error(`Failed to send reschedule emails for booking ${booking.id}:`, emailError);
            // Don't fail the operation if email fails
        }

        // 4. Send Telegram notification to business owner
        try {
            const telegramMessage = `
📅 **BOOKING RESCHEDULED**

**Customer:** ${booking.owner_name}
**Phone:** ${booking.phone}
**Service:** ${serviceDisplayName}

**OLD TIME:** ${oldFormattedDate} at ${oldFormattedTime}
**NEW TIME:** ${newFormattedDate} at ${newFormattedTime}

**Dogs:** ${dogNames}
${booking.price_pounds ? `**Price:** £${parseFloat(booking.price_pounds).toFixed(2)}` : ''}

**Address:** ${booking.address}
            `.trim();

            await sendTelegramNotification(telegramMessage);
        } catch (telegramError) {
            console.error("Failed to send Telegram notification:", telegramError);
            // Don't fail the operation if Telegram fails
        }

        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: "Booking rescheduled successfully",
            booking_id: data.booking_id,
            new_start_time: data.new_start_time,
            new_end_time: data.new_end_time
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Reschedule booking error:", error);
        return NextResponse.json(
            { error: "Failed to reschedule booking. Please try again." },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}