import { NextResponse, type NextRequest } from "next/server";
import { sendEmail } from "@/lib/emailService";
import { format, startOfDay, endOfDay } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendBookingEmail } from "@/lib/emailService";
import { getServiceDisplayName } from "@/lib/serviceTypes";
import { generateCalendarEvent, type CalendarEventData } from "@/lib/calendarEvents";
import { getPool } from '@/lib/database';
import { getCalendar, getCalendarId } from '@/lib/googleCalendar';
import { getWalkLimitForDate } from '@/lib/walkLimit';

// Database Connection
const pool = getPool();

// Google Calendar
const calendar = getCalendar();

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
                b.booking_type,
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
            GROUP BY b.id, b.service_type, b.booking_type, b.start_time, b.end_time, b.duration_minutes,
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

        // Walk limit check during multi-day sitting (exclude the booking being rescheduled from count)
        const serviceTypeLower = (booking.service_type || '').toLowerCase();
        if (serviceTypeLower === 'solo' || serviceTypeLower === 'quick') {
            const targetDate = new Date(data.new_start_time).toISOString().split('T')[0];
            const limitResult = await getWalkLimitForDate(pool, targetDate, data.booking_id);
            if (limitResult.limitReached) {
                await client.query("ROLLBACK");
                return NextResponse.json(
                    { error: `Walk limit reached for this date (${limitResult.currentWalkCount}/${limitResult.walkLimit} during active sitting). Cannot reschedule to this date.` },
                    { status: 409 }
                );
            }
        }

        // Reject if a holiday/personal all-day calendar block covers the new date
        {
            const rescheduleDate = new Date(data.new_start_time);
            const blockCheckRes = await calendar.events.list({
                calendarId: getCalendarId(),
                timeMin: startOfDay(rescheduleDate).toISOString(),
                timeMax: endOfDay(rescheduleDate).toISOString(),
                singleEvents: true,
            });
            const hasHolidayBlock = (blockCheckRes.data.items || []).some(event => {
                if (!event.start?.date || !event.end?.date) return false;
                const summary = event.summary || '';
                const description = event.description || '';
                if (summary.includes('Multi-Day Dog Sitting')) return false;
                if (summary.includes('Dog Sitting')) return false;
                if (description.includes('Multi-day booking')) return false;
                if (description.includes('Booking Type: Multi-Day')) return false;
                return true;
            });
            if (hasHolidayBlock) {
                await client.query("ROLLBACK");
                return NextResponse.json(
                    { error: "This date is not available for bookings" },
                    { status: 409 }
                );
            }
        }

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
        // 4. Walk/quick/meet bookings never block a sitting reschedule (V11.1 bidirectional)
        const reschedulingServiceType = (booking.service_type || '').toLowerCase();
        const reschedulingIsSitting = reschedulingServiceType.includes('sitting');

        const actualConflicts = conflictResult.rows.filter(row => {
            // Exclude the booking being rescheduled
            if (Number(row.id) === bookingIdNum) return false;

            // Check if this is a dog sitting that allows walk coexistence
            const serviceType = (row.service_type || '').toLowerCase();
            const isSitting = serviceType.includes('sitting');
            const isWalk = serviceType.includes('walk') || serviceType.includes('solo') || serviceType.includes('quick') || serviceType.includes('meet');

            // Rescheduling a sitting: walks can always coexist (bidirectional V11.1 rule)
            if (reschedulingIsSitting && isWalk) return false;

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

        // Calculate new duration — only stored for single (walk) bookings;
        // multi_day and single_day_sitting must keep duration_minutes = NULL (DB constraint)
        const newDurationMinutes = Math.round((newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60));
        const durationToStore = booking.booking_type === 'single' ? newDurationMinutes : null;

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
            durationToStore
        ]);

        // 2. Update Google Calendar event
        const serviceDisplayName = getServiceDisplayName(booking.service_type);
        const dogNames = booking.dog_names?.join(" & ") || "dogs";
        let calendarUpdated = false;

        if (booking.google_event_id) {
            try {
                // Generate standardized calendar event using shared utility
                const calendarEventData: CalendarEventData = {
                    service_type: serviceDisplayName,
                    dogNames,
                    ownerName: booking.owner_name,
                    phone: booking.phone,
                    email: booking.email,
                    address: booking.address,
                    duration_minutes: newDurationMinutes,
                    booking_type: 'single',
                    start_time: newStartTime,
                    end_time: newEndTime,
                    price: booking.price_pounds ? parseFloat(booking.price_pounds) : undefined,
                    status: 'confirmed',
                    isRescheduled: true,
                    oldStartTime: new Date(booking.old_start_time),
                };

                const event = generateCalendarEvent(calendarEventData, newStartTime, newEndTime);

                await calendar.events.patch({
                    calendarId: getCalendarId(),
                    eventId: booking.google_event_id,
                    requestBody: event,
                });
                calendarUpdated = true;
                console.log("Google Calendar event updated:", booking.google_event_id);
            } catch (calendarError) {
                console.error("Failed to update calendar event:", calendarError);
                // Don't fail the whole operation if calendar update fails
            }
        } else {
            console.warn(`Booking ${data.booking_id} has no google_event_id - calendar not updated`);
        }

        // 3. Send reschedule confirmation email using new email service
        const oldFormattedDate = format(new TZDate(new Date(booking.old_start_time), "Europe/London"), "EEEE, MMMM d, yyyy");
        const oldFormattedTime = format(new TZDate(new Date(booking.old_start_time), "Europe/London"), "h:mm a");
        const newFormattedDate = format(new TZDate(newStartTime, "Europe/London"), "EEEE, MMMM d, yyyy");
        const newFormattedTime = format(new TZDate(newStartTime, "Europe/London"), "h:mm a");

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
📅 **BOOKING RESCHEDULED** (ID: ${data.booking_id})

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
            new_end_time: data.new_end_time,
            calendar_updated: calendarUpdated,
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