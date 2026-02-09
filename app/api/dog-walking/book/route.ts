// Enhanced booking API route with duration-based pricing for solo walks and secondary address support
// This is the updated /app/api/dog-walking/book/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { format, differenceInDays, differenceInHours, isSameDay } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { sendEmail } from "@/lib/emailService";
import { getServicePrice, getSoloWalkPrice } from '@/lib/pricing';
import { sendBookingEmail } from "@/lib/emailService";
import { formatDurationForEmail } from "@/lib/emailTemplates";
import { normalizeServiceType, getServiceDisplayName } from "@/lib/serviceTypes";
import { generateCalendarEvent, type CalendarEventData } from "@/lib/calendarEvents";
import { getPool } from '@/lib/database';
import { getCalendar, getCalendarId } from '@/lib/googleCalendar';

// --- Database Connection ---
const pool = getPool();

// --- Google Calendar ---
const calendar = getCalendar();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("Booking request body:", body);
        const {
            ownerId,
            dog_id_1,
            dog_id_2,
            service_type,
            start_time,
            end_time,
            duration_minutes,
            owner_name,
            phone,
            email,
            address,
            dog_name_1,
            dog_name_2,
            secondary_address_id // NEW: Secondary address selection
        } = body;

        // Normalize service type for consistent storage
        const normalizedServiceType = normalizeServiceType(service_type);
        console.log(`[Booking] Service type: "${service_type}" -> normalized: "${normalizedServiceType}"`);

        // Log secondary address selection
        if (secondary_address_id) {
            console.log(`[Booking] Using secondary address ID: ${secondary_address_id}`);
        } else {
            console.log(`[Booking] Using primary address`);
        }

        // Determine booking type based on actual date comparison (FIXED)
        let booking_type: string;
        if (end_time && duration_minutes) {
            // Has both end_time AND duration_minutes (shouldn't happen, but handle it)
            booking_type = 'single';
        } else if (end_time && !duration_minutes) {
            // Has end_time but no duration_minutes - check if same day
            const startDate = new Date(start_time);
            const endDate = new Date(end_time);
            booking_type = isSameDay(startDate, endDate) ? 'single_day_sitting' : 'multi_day';
        } else {
            // Has duration_minutes or neither (standard walk booking)
            booking_type = 'single';
        }

        // Validate multi-day booking logic
        if (service_type === 'Dog Sitting' && booking_type !== 'multi_day') {
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
            if (service_type.toLowerCase().includes('walk') || service_type.toLowerCase().includes('greet')) {
                return NextResponse.json(
                    { error: `Multi-day bookings are only available for Dog Sitting. Service received: ${service_type}` },
                    { status: 400 }
                );
            }
        }

        // Validate: Single-day sitting overlapping walks must be 6+ hours
        // (Backup validation - frontend should prevent invalid selections)
        if (booking_type === 'single_day_sitting' && end_time) {
            const sittingDuration = differenceInHours(new Date(end_time), new Date(start_time));

            if (sittingDuration < 6) {
                // Check if there are walks on this day via Google Calendar
                // Use TZDate for consistent London timezone handling
                const startDateObj = new Date(start_time);
                const dayStart = new TZDate(
                    startDateObj.getFullYear(),
                    startDateObj.getMonth(),
                    startDateObj.getDate(),
                    0, 0, 0,
                    "Europe/London"
                );
                const dayEnd = new TZDate(
                    startDateObj.getFullYear(),
                    startDateObj.getMonth(),
                    startDateObj.getDate(),
                    23, 59, 59,
                    "Europe/London"
                );

                const calendarEvents = await calendar.events.list({
                    calendarId: getCalendarId(),
                    timeMin: dayStart.toISOString(),
                    timeMax: dayEnd.toISOString(),
                    singleEvents: true,
                });

                const hasWalks = (calendarEvents.data.items || []).some(event => {
                    const summary = (event.summary || '').toLowerCase();
                    return summary.includes('walk') || summary.includes('meet');
                });

                if (hasWalks) {
                    return NextResponse.json(
                        { error: "Single-day sitting must be at least 6 hours when walks are booked on the same day" },
                        { status: 400 }
                    );
                }
            }
        }

        // Generate cancellation token
        const cancellation_token = crypto.randomUUID();

        // --- Calculate Price Based on Service Type (UPDATED for Duration-Based Pricing) ---
        let finalPrice: number | null = null;

        // NEW: Check if this is a solo walk with duration-based pricing
        const isSoloWalk = service_type.toLowerCase().includes('solo walk');

        if (isSoloWalk && duration_minutes) {
            // NEW: Calculate solo walk price based on duration and dog count
            const dogCount = dog_id_2 ? 2 : 1;
            finalPrice = getSoloWalkPrice(duration_minutes, dogCount);
            console.log(`Solo Walk Duration Pricing: ${duration_minutes}min, ${dogCount} dogs -> £${finalPrice}`);
        } else {
            // Fallback to static pricing for other services
            const serviceTypeMap: Record<string, string> = {
                'Meet & Greet - for new clients': 'meetgreet',
                'Solo Walk (60 min)': 'solo', // Legacy compatibility
                'Quick Walk (30 min)': 'quick',
                'Dog Sitting (Variable)': 'sitting'
            };

            const pricingServiceId = serviceTypeMap[service_type];
            if (pricingServiceId) {
                finalPrice = getServicePrice(pricingServiceId);
            }
        }

        console.log(`Service: ${service_type} -> Final Price: £${finalPrice}`);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // --- NEW: Validate secondary address if provided ---
            if (secondary_address_id) {
                const addressCheck = await client.query(
                    `SELECT id, address_label, is_active FROM hunters_hounds.secondary_addresses 
                     WHERE id = $1 AND owner_id = $2`,
                    [secondary_address_id, ownerId]
                );

                if (addressCheck.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return NextResponse.json(
                        { error: "Selected address not found or doesn't belong to this customer" },
                        { status: 400 }
                    );
                }

                if (!addressCheck.rows[0].is_active) {
                    await client.query('ROLLBACK');
                    return NextResponse.json(
                        { error: "Selected address is inactive. Please choose a different address." },
                        { status: 400 }
                    );
                }

                console.log(`[Booking] Validated secondary address: ${addressCheck.rows[0].address_label}`);
            }

            // --- 1. Insert Booking Record (UPDATED with secondary_address_id) ---
            const insertBookingQuery = `
                INSERT INTO hunters_hounds.bookings 
                (owner_id, dog_id_1, dog_id_2, service_type, start_time, end_time, duration_minutes, 
                 price_pounds, booking_type, cancellation_token, secondary_address_id, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed') 
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
                normalizedServiceType,
                start_time,
                calculatedEndTime,
                booking_type === 'single' ? duration_minutes : null,
                finalPrice, // ✅ Now includes duration-based pricing for solo walks
                booking_type,
                cancellation_token,
                secondary_address_id || null // NEW: Store secondary address selection
            ];

            const bookingResult = await client.query(insertBookingQuery, bookingValues);
            const bookingId = bookingResult.rows[0].id;

            console.log(`[Booking] Created booking ${bookingId} with ${secondary_address_id ? 'secondary' : 'primary'} address`);

            // --- 2. Create Google Calendar Event ---
            const dogNames = dog_name_2 ? `${dog_name_1} & ${dog_name_2}` : dog_name_1;

            // NEW: Get address info for calendar event
            let eventAddress = address; // Default to primary address
            let addressLabel = "Primary Address";

            if (secondary_address_id) {
                const addressInfo = await client.query(
                    `SELECT address, address_label FROM hunters_hounds.secondary_addresses WHERE id = $1`,
                    [secondary_address_id]
                );

                if (addressInfo.rows.length > 0) {
                    eventAddress = addressInfo.rows[0].address;
                    addressLabel = addressInfo.rows[0].address_label;
                }
            }

            // Calculate duration for calendar event
            let calculatedDurationMinutes = duration_minutes;
            let calculatedDurationDays: number | undefined;
            let calendarBookingType: 'single' | 'multi_day' = 'single';

            if (booking_type === 'multi_day') {
                calculatedDurationDays = differenceInDays(new Date(end_time), new Date(start_time)) + 1;
                calendarBookingType = 'multi_day';
            } else if (booking_type === 'single_day_sitting') {
                // Single-day sitting: calculate minutes from hours
                const numHours = differenceInHours(new Date(end_time), new Date(start_time));
                calculatedDurationMinutes = numHours * 60;
                calendarBookingType = 'single';
            }

            // Calculate end time
            const endDateTime = (booking_type === 'multi_day' || booking_type === 'single_day_sitting')
                ? new Date(end_time)
                : new Date(new Date(start_time).getTime() + (duration_minutes || 0) * 60000);

            // Generate standardized calendar event using shared utility
            const calendarEventData: CalendarEventData = {
                service_type,
                dogNames,
                ownerName: owner_name,
                phone,
                email,
                address: eventAddress,
                addressLabel,
                duration_minutes: calculatedDurationMinutes,
                duration_days: calculatedDurationDays,
                booking_type: calendarBookingType,
                start_time: new Date(start_time),
                end_time: endDateTime,
                price: finalPrice !== null ? finalPrice : undefined,
                status: 'confirmed',
            };

            const event = generateCalendarEvent(calendarEventData, new Date(start_time), endDateTime);

            const calendarResponse = await calendar.events.insert({
                calendarId: getCalendarId(),
                requestBody: event,
            });

            const googleEventId = calendarResponse.data.id;

            // Update booking with Google Event ID
            await client.query(
                `UPDATE hunters_hounds.bookings SET google_event_id = $1 WHERE id = $2`,
                [googleEventId, bookingId]
            );

            // --- 3. Send Confirmation Email (ENHANCED with Address Info) ---
            const cancellationLink = `https://hunters-hounds.com/dog-walking/cancel?token=${cancellation_token}`;
            const dashboardLink = `https://hunters-hounds.com/my-account`;

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
                    <p><strong>Location:</strong> ${addressLabel}</p>
                    <p><strong>Address:</strong> ${eventAddress}</p>
                    <br>
                    <p>This is a multi-day booking where I'll be providing continuous care for your dog(s). We'll discuss the specific arrangements and pricing (POA) before the start date.</p>
                    <br>
                    <p>Please save this confirmation email for your records. I'll be in touch closer to the start date to coordinate details.</p>
                    <br>
                    
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
            } else if (booking_type === 'single_day_sitting') {
                // NEW: Same-day dog sitting (like 10:30-19:30)
                const numHours = differenceInHours(new Date(end_time), new Date(start_time));
                const displayDate = format(new Date(start_time), "EEEE, dd MMMM");
                const startTimeOnly = format(new Date(start_time), "HH:mm");
                const endTimeOnly = format(new Date(end_time), "HH:mm");

                emailSubject = `Hunter's Hounds ${numHours} Hour Dog Sitting Confirmed`;
                emailContent = `
                    <h1>${numHours} Hour Dog Sitting Confirmed!</h1>
                    <p>Hi ${owner_name},</p>
                    <p>Your <strong>${numHours}-hour dog sitting booking</strong> is confirmed!</p>
                    <p><strong>Date:</strong> ${displayDate}</p>
                    <p><strong>Time:</strong> ${startTimeOnly} - ${endTimeOnly}</p>
                    <p><strong>Dog(s):</strong> ${dogNames}</p>
                    <p><strong>Duration:</strong> ${numHours} hours</p>
                    <p><strong>Location:</strong> ${addressLabel}</p>
                    <p><strong>Address:</strong> ${eventAddress}</p>
                    <br>
                    <p>I'll be providing dedicated care for your dog(s) during this ${numHours}-hour session. We'll discuss the specific arrangements and pricing (POA) before the scheduled time.</p>
                    <br>
                    <p>Please save this confirmation email for your records. I'll be in touch if I need any additional details.</p>
                    <br>
                    
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
            } else {
                // Standard walk bookings
                const displayDate = format(new Date(start_time), "EEEE, dd MMMM 'at' HH:mm");
                emailSubject = `Hunter's Hounds Booking Confirmation: ${displayDate}`;

                // Include pricing in email for confirmed bookings
                const priceDisplay = finalPrice ? `<p><strong>Total Price:</strong> £${finalPrice.toFixed(2)}</p>` : '';

                emailContent = `
                    <h1>Booking Confirmed!</h1>
                    <p>Hi ${owner_name},</p>
                    <p>Your booking for a <strong>${service_type}</strong> is confirmed!</p>
                    <p><strong>Date & Time:</strong> ${displayDate}</p>
                    <p><strong>Dog(s):</strong> ${dogNames}</p>
                    <p><strong>Duration:</strong> ${formatDurationForEmail(duration_minutes)}</p>
                    <p><strong>Location:</strong> ${addressLabel}</p>
                    <p><strong>Address:</strong> ${eventAddress}</p>
                    ${priceDisplay}
                    <p>Please save this confirmation email for your records. We'll see you at the scheduled time!</p>
                    <br>
                    
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

            // --- 4. Send Telegram Notification (ENHANCED with proper booking types) ---
            let telegramMessage;

            if (booking_type === 'multi_day') {
                const numDays = differenceInDays(new Date(end_time), new Date(start_time)) + 1;
                telegramMessage = `
🐕 NEW MULTI-DAY DOG SITTING BOOKING (#${bookingId})

📅 ${numDays} days: ${format(new Date(start_time), "MMM d HH:mm")} → ${format(new Date(end_time), "MMM d HH:mm")}
👤 ${owner_name} (${phone})
🐾 ${dogNames}
📍 ${addressLabel}: ${eventAddress}
📧 ${email}
                `;
            } else if (booking_type === 'single_day_sitting') {
                // NEW: Same-day dog sitting notification
                const numHours = differenceInHours(new Date(end_time), new Date(start_time));
                telegramMessage = `
🐕 NEW ${numHours}H DOG SITTING BOOKING (#${bookingId})

📅 ${format(new Date(start_time), "EEE, MMM d")} ${format(new Date(start_time), "HH:mm")} → ${format(new Date(end_time), "HH:mm")}
👤 ${owner_name} (${phone})
🐾 ${dogNames}
⏱️ ${numHours} hours
📍 ${addressLabel}: ${eventAddress}
📧 ${email}
                `;
            } else {
                // Standard walk bookings
                const priceInfo = finalPrice ? `💰 £${finalPrice.toFixed(2)}` : '';
                telegramMessage = `
🐕 NEW BOOKING: ${service_type.toUpperCase()} (#${bookingId})

📅 ${format(new Date(start_time), "EEE, MMM d 'at' HH:mm")}
👤 ${owner_name} (${phone})
🐾 ${dogNames}
⏱️ ${duration_minutes} minutes
${priceInfo}
📍 ${addressLabel}: ${eventAddress}
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

            // --- 5. Send Confirmation Email Using New Email Service (MOVED AFTER COMMIT) ---
            try {
                await sendBookingEmail(bookingId, emailSubject, emailContent);
                console.log(`Confirmation emails sent to all recipients for booking ${bookingId}`);
            } catch (emailError) {
                console.error("Failed to send confirmation email:", emailError);
                // Don't fail the booking if email fails - booking is already committed
            }

            return NextResponse.json({
                success: true,
                booking_id: bookingId,
                google_event_id: googleEventId,
                cancellation_token: cancellation_token,
                booking_type: booking_type,
                price: finalPrice, // NEW: Return calculated price
                secondary_address_used: !!secondary_address_id, // NEW: Indicate if secondary address was used
                address_label: secondary_address_id ? addressLabel : "Primary Address", // NEW: Return address label
                message: booking_type === 'multi_day'
                    ? "Multi-day dog sitting booking confirmed!"
                    : booking_type === 'single_day_sitting'
                        ? "Same-day dog sitting booking confirmed!"
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