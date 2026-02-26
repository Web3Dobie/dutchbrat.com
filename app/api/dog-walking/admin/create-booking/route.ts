import { NextResponse, type NextRequest } from "next/server";
import { format, isPast, addMinutes, differenceInDays, differenceInHours, isSameDay } from "date-fns";
import { sendEmail } from "@/lib/emailService";
import { sendTelegramNotification } from "@/lib/telegram";
import { getServicePrice, getSoloWalkPrice } from '@/lib/pricing'; // ← ADDED getSoloWalkPrice
import { sendBookingEmail } from "@/lib/emailService";
import { formatDurationForEmail } from "@/lib/emailTemplates";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { normalizeServiceType, getServiceDisplayName } from "@/lib/serviceTypes";
import { generateCalendarEvent, type CalendarEventData } from "@/lib/calendarEvents";
import { getPool } from '@/lib/database';
import { getCalendar, getCalendarId } from '@/lib/googleCalendar';

// --- Database Connection ---
const pool = getPool();

// --- Google Calendar ---
const calendar = getCalendar();

interface AdminBookingRequest {
    owner_id: number;
    dog_id_1: number;
    dog_id_2?: number;
    service_type: string;
    start_time: string; // ISO string
    duration_minutes?: number;
    end_time?: string; // ISO string for multi-day
    notes?: string;
    create_calendar_event?: boolean; // Default true for future, false for past
    send_email?: boolean; // Default false for historical bookings
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data: AdminBookingRequest = await request.json();

        // --- Validation ---
        if (!data.owner_id || !data.dog_id_1 || !data.service_type || !data.start_time) {
            return NextResponse.json(
                { error: "Missing required fields: owner_id, dog_id_1, service_type, start_time" },
                { status: 400 }
            );
        }

        const startTime = new Date(data.start_time);
        const isHistorical = isPast(startTime);

        // Normalize service type for consistent storage
        const normalizedServiceType = normalizeServiceType(data.service_type);
        const serviceDisplayName = getServiceDisplayName(normalizedServiceType);
        console.log(`[Admin Booking] Service type: "${data.service_type}" -> normalized: "${normalizedServiceType}", display: "${serviceDisplayName}"`);

        // Determine booking type (mirrors client route: same-day sitting vs multi-day vs single)
        const booking_type = data.end_time && !data.duration_minutes
            ? (isSameDay(startTime, new Date(data.end_time)) ? 'single_day_sitting' : 'multi_day')
            : 'single';

        // Calculate end_time for single bookings
        let endTime: Date;
        if (booking_type === 'single' && data.duration_minutes) {
            endTime = addMinutes(startTime, data.duration_minutes);
        } else if (data.end_time) {
            endTime = new Date(data.end_time);
        } else {
            return NextResponse.json(
                { error: "Must provide either duration_minutes (single) or end_time (multi-day)" },
                { status: 400 }
            );
        }

        // --- Calculate Price Based on Service Type (UPDATED for Duration-Based Pricing) ---
        let finalPrice: number | null = null;

        // NEW: Check if this is a solo walk with duration-based pricing
        const isSoloWalk = data.service_type.toLowerCase().includes('solo walk');

        if (isSoloWalk && data.duration_minutes) {
            // NEW: Calculate solo walk price based on duration and dog count
            const dogCount = data.dog_id_2 ? 2 : 1;
            finalPrice = getSoloWalkPrice(data.duration_minutes, dogCount);
            console.log(`Admin Solo Walk Duration Pricing: ${data.duration_minutes}min, ${dogCount} dogs -> £${finalPrice}`);
        } else {
            // UPDATED: Enhanced service type map with new solo walk durations
            const serviceTypeMap: Record<string, string> = {
                'Meet & Greet - for new clients': 'meetgreet',
                'Solo Walk (60 min)': 'solo',   // Legacy compatibility
                'Solo Walk (120 min)': 'solo',  // NEW: 2-hour option
                'Quick Walk (30 min)': 'quick',
                'Dog Sitting (Variable)': 'sitting'
            };

            const pricingServiceId = serviceTypeMap[data.service_type];
            finalPrice = pricingServiceId ? getServicePrice(pricingServiceId) : null;
        }

        console.log(`Admin Service: ${data.service_type} -> Final Price: £${finalPrice}`);

        // Generate cancellation token
        const cancellation_token = globalThis.crypto.randomUUID(); // ← FIXED: Use globalThis.crypto

        // Determine status based on timing
        const status = isHistorical ? 'completed' : 'confirmed';

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // --- 1. Fetch customer and dog details ---
            const customerQuery = `
                SELECT 
                    o.owner_name, o.phone, o.email, o.address,
                    d1.dog_name as dog_name_1, 
                    d2.dog_name as dog_name_2
                FROM hunters_hounds.owners o
                JOIN hunters_hounds.dogs d1 ON o.id = d1.owner_id AND d1.id = $2
                LEFT JOIN hunters_hounds.dogs d2 ON o.id = d2.owner_id AND d2.id = $3
                WHERE o.id = $1;
            `;

            const customerResult = await client.query(customerQuery, [
                data.owner_id,
                data.dog_id_1,
                data.dog_id_2 || null
            ]);

            if (customerResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Customer or dog not found" },
                    { status: 404 }
                );
            }

            const customer = customerResult.rows[0];

            // --- 2. Insert booking record ---
            const insertBookingQuery = `
                INSERT INTO hunters_hounds.bookings 
                (owner_id, dog_id_1, dog_id_2, service_type, start_time, end_time, 
                 duration_minutes, price_pounds, booking_type, cancellation_token, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
                RETURNING id
            `;

            const bookingValues = [
                data.owner_id,
                data.dog_id_1,
                data.dog_id_2 || null,
                normalizedServiceType,
                startTime.toISOString(),
                endTime.toISOString(),
                booking_type === 'single' ? data.duration_minutes : null,
                finalPrice,
                booking_type,
                cancellation_token,
                status
            ];

            const bookingResult = await client.query(insertBookingQuery, bookingValues);
            const bookingId = bookingResult.rows[0].id;

            let googleEventId: string | null = null;

            // --- 3. Create Google Calendar Event (configurable) ---
            const shouldCreateCalendarEvent = data.create_calendar_event ?? !isHistorical;

            if (shouldCreateCalendarEvent) {
                try {
                    const dogNames = customer.dog_name_2
                        ? `${customer.dog_name_1} & ${customer.dog_name_2}`
                        : customer.dog_name_1;

                    // Calculate duration for calendar event
                    let calculatedDurationMinutes = data.duration_minutes;
                    let calculatedDurationDays: number | undefined;

                    if (booking_type === 'multi_day') {
                        calculatedDurationDays = differenceInDays(endTime, startTime) + 1;
                    }

                    // Generate standardized calendar event using shared utility
                    const calendarEventData: CalendarEventData = {
                        service_type: serviceDisplayName,
                        dogNames,
                        ownerName: customer.owner_name,
                        phone: customer.phone,
                        email: customer.email,
                        address: customer.address,
                        duration_minutes: calculatedDurationMinutes,
                        duration_days: calculatedDurationDays,
                        booking_type: booking_type,
                        start_time: startTime,
                        end_time: endTime,
                        price: finalPrice !== null ? finalPrice : undefined,
                        notes: data.notes,
                        status: status,
                        isHistorical: isHistorical,
                    };

                    const event = generateCalendarEvent(calendarEventData, startTime, endTime);

                    const calendarResponse = await calendar.events.insert({
                        calendarId: getCalendarId(),
                        requestBody: event,
                    });

                    googleEventId = calendarResponse.data.id || null;

                    // Update booking with Google Event ID
                    if (googleEventId) {
                        await client.query(
                            `UPDATE hunters_hounds.bookings SET google_event_id = $1 WHERE id = $2`,
                            [googleEventId, bookingId]
                        );
                    }
                } catch (calendarError) {
                    console.error("Failed to create calendar event:", calendarError);
                    // Don't fail the booking if calendar fails
                }
            }

            // --- 4. Prepare Email Data (will send after commit) ---
            const shouldSendEmail = data.send_email ?? false;
            const dogNamesForEmail = customer.dog_name_2
                ? `${customer.dog_name_1} & ${customer.dog_name_2}`
                : customer.dog_name_1;

            const cancellationLink = `https://hunters-hounds.com/dog-walking/cancel?token=${cancellation_token}`;
            const dashboardLink = `https://hunters-hounds.com/my-account`;

            let emailSubject: string;
            let emailContent: string;

            if (booking_type === 'multi_day') {
                const numDays = differenceInDays(endTime, startTime) + 1;
                emailSubject = `Hunter's Hounds Multi-Day Dog Sitting Confirmed: ${numDays} days`;
                emailContent = `
                    <h1>Multi-Day Dog Sitting Confirmed!</h1>
                    <p>Hi ${customer.owner_name},</p>
                    <p>Your <strong>${numDays}-day dog sitting booking</strong> is confirmed!</p>
                    <p><strong>Start:</strong> ${format(startTime, "EEEE, MMMM d 'at' HH:mm")}</p>
                    <p><strong>End:</strong> ${format(endTime, "EEEE, MMMM d 'at' HH:mm")}</p>
                    <p><strong>Dog(s):</strong> ${dogNamesForEmail}</p>
                    <p><strong>Duration:</strong> ${numDays} days</p>
                    <p><strong>Address:</strong> ${customer.address}</p>
                    <br>
                    <p>This is a multi-day booking where I'll be providing continuous care for your dog(s). We'll discuss the specific arrangements and pricing (POA) before the start date.</p>
                    <br>
                    <p>Please save this confirmation email for your records. I'll be in touch closer to the start date to coordinate details.</p>
                    <br>
                    <p><strong>Manage Your Booking:</strong></p>
                    <a href="${dashboardLink}" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #3b82f6; border-radius: 4px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">
                        View Dashboard
                    </a>
                    <p>If you need to cancel this appointment, please click the button below:</p>
                    <a href="${cancellationLink}" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #ef4444; border-radius: 4px; text-decoration: none;">
                        Cancel Booking
                    </a>
                    <br><br>
                    <p><strong>Cancellation Policy:</strong> You can cancel your booking at any time with no fee. For multi-day bookings, please provide as much notice as possible.</p>
                    <p>Thank you!</p>
                `;
            } else if (booking_type === 'single_day_sitting') {
                const numHours = differenceInHours(endTime, startTime);
                const displayDate = format(startTime, "EEEE, dd MMMM");
                const startTimeOnly = format(startTime, "HH:mm");
                const endTimeOnly = format(endTime, "HH:mm");
                emailSubject = `Hunter's Hounds ${numHours} Hour Dog Sitting Confirmed`;
                emailContent = `
                    <h1>${numHours} Hour Dog Sitting Confirmed!</h1>
                    <p>Hi ${customer.owner_name},</p>
                    <p>Your <strong>${numHours}-hour dog sitting booking</strong> is confirmed!</p>
                    <p><strong>Date:</strong> ${displayDate}</p>
                    <p><strong>Time:</strong> ${startTimeOnly} - ${endTimeOnly}</p>
                    <p><strong>Dog(s):</strong> ${dogNamesForEmail}</p>
                    <p><strong>Duration:</strong> ${numHours} hours</p>
                    <p><strong>Address:</strong> ${customer.address}</p>
                    <br>
                    <p>I'll be providing dedicated care for your dog(s) during this ${numHours}-hour session. We'll discuss the specific arrangements and pricing (POA) before the scheduled time.</p>
                    <br>
                    <p>Please save this confirmation email for your records. I'll be in touch if I need any additional details.</p>
                    <br>
                    <p><strong>Manage Your Booking:</strong></p>
                    <a href="${dashboardLink}" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #3b82f6; border-radius: 4px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">
                        View Dashboard
                    </a>
                    <p>If you need to cancel this appointment, please click the button below:</p>
                    <a href="${cancellationLink}" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #ef4444; border-radius: 4px; text-decoration: none;">
                        Cancel Booking
                    </a>
                    <br><br>
                    <p><strong>Cancellation Policy:</strong> You can cancel your booking at any time with no fee. Please contact us at 07932749772 or use the cancellation link above.</p>
                    <p>Thank you!</p>
                `;
            } else {
                const displayDate = format(startTime, "EEEE, dd MMMM 'at' HH:mm");
                emailSubject = `Hunter's Hounds Booking Confirmation: ${displayDate}`;
                const priceDisplay = finalPrice ? `<p><strong>Total Price:</strong> £${finalPrice.toFixed(2)}</p>` : '';
                emailContent = `
                    <h1>Booking Confirmed!</h1>
                    <p>Hi ${customer.owner_name},</p>
                    <p>Your booking for a <strong>${serviceDisplayName}</strong> is confirmed!</p>
                    <p><strong>Date & Time:</strong> ${displayDate}</p>
                    <p><strong>Dog(s):</strong> ${dogNamesForEmail}</p>
                    <p><strong>Duration:</strong> ${formatDurationForEmail(data.duration_minutes ?? null)}</p>
                    <p><strong>Address:</strong> ${customer.address}</p>
                    ${priceDisplay}
                    <p>Please save this confirmation email for your records. We'll see you at the scheduled time!</p>
                    <br>
                    <p><strong>Manage Your Booking:</strong></p>
                    <a href="${dashboardLink}" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #3b82f6; border-radius: 4px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">
                        View Dashboard
                    </a>
                    <p>If you need to cancel this appointment, please click the button below:</p>
                    <a href="${cancellationLink}" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #ef4444; border-radius: 4px; text-decoration: none;">
                        Cancel Booking
                    </a>
                    <br><br>
                    <p><strong>Cancellation Policy:</strong> You can cancel your booking at any time with no fee. Please contact us at 07932749772 or use the cancellation link above.</p>
                    <p>Thank you!</p>
                `;
            }

            // --- 5. Send Telegram Notification ---
            try {
                const dogNames = customer.dog_name_2
                    ? `${customer.dog_name_1} & ${customer.dog_name_2}`
                    : customer.dog_name_1;

                const telegramMessage = `
${isHistorical ? '📋 HISTORICAL BOOKING ADDED' : '🐕 NEW ADMIN BOOKING'} (#${bookingId})

📅 ${format(startTime, "EEE, MMM d 'at' HH:mm")} ${booking_type === 'multi_day' ? `→ ${format(endTime, "MMM d 'at' HH:mm")}` : `(${data.duration_minutes}min)`}
👤 ${customer.owner_name} (${customer.phone})
🐾 ${dogNames}
🎯 ${serviceDisplayName}
📍 ${customer.address}
📧 ${customer.email}
${finalPrice !== null ? (finalPrice === 0 ? '💰 FREE' : `💰 £${finalPrice.toFixed(2)}`) : '💰 POA'}
${isHistorical ? '✅ Status: COMPLETED' : '🟡 Status: CONFIRMED'}
${data.notes ? `📝 Notes: ${data.notes}` : ''}
                `.trim();

                await sendTelegramNotification(telegramMessage);
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
                // Don't fail the booking if Telegram fails
            }

            await client.query('COMMIT');

            // --- 6. Send Email AFTER commit (so email service can see the booking) ---
            if (shouldSendEmail && !isHistorical) {
                try {
                    await sendBookingEmail(bookingId, emailSubject, emailContent);
                } catch (emailError) {
                    console.error(`Failed to send booking confirmation emails for booking ${bookingId}:`, emailError);
                    // Don't fail the booking if email fails
                }
            }

            return NextResponse.json({
                success: true,
                booking_id: bookingId,
                google_event_id: googleEventId,
                status: status,
                is_historical: isHistorical,
                message: isHistorical
                    ? "Historical booking added successfully"
                    : "Admin booking created successfully"
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Error creating admin booking:", error);
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Admin booking API error:", error);
        return NextResponse.json(
            { error: "Failed to create booking. Please try again." },
            { status: 500 }
        );
    }
}