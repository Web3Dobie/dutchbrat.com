import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { format, isPast, addMinutes } from "date-fns";
import { Pool } from "pg";
import { sendEmail } from "@/lib/emailService";
import { sendTelegramNotification } from "@/lib/telegram";
import { getServicePrice, getSoloWalkPrice } from '@/lib/pricing'; // ← ADDED getSoloWalkPrice
import { sendBookingEmail } from "@/lib/emailService";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

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

        // Determine booking type
        const booking_type = data.end_time && !data.duration_minutes ? 'multi_day' : 'single';

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
                data.service_type,
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

                    const eventTitle = booking_type === 'multi_day'
                        ? `${data.service_type} - ${dogNames} (Multi-day)`
                        : `${data.service_type} - ${dogNames}`;

                    const eventDescription = `
${isHistorical ? 'HISTORICAL BOOKING' : 'BOOKING CONFIRMATION'}

Owner: ${customer.owner_name}
Dog(s): ${dogNames}
Service: ${data.service_type}
${booking_type === 'single' ? `Duration: ${data.duration_minutes} minutes` : 'Multi-day booking'}
Address: ${customer.address}
Phone: ${customer.phone}
Email: ${customer.email}
${data.notes ? `Notes: ${data.notes}` : ''}
Status: ${status.toUpperCase()}
                    `.trim();

                    const event = {
                        summary: eventTitle,
                        description: eventDescription,
                        start: {
                            dateTime: startTime.toISOString(),
                            timeZone: "Europe/London"
                        },
                        end: {
                            dateTime: endTime.toISOString(),
                            timeZone: "Europe/London"
                        },
                    };

                    const calendarResponse = await calendar.events.insert({
                        calendarId: process.env.GOOGLE_CALENDAR_ID,
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

            // --- 4. Send Email (configurable, default off for historical) ---
            const shouldSendEmail = data.send_email ?? false;

            if (shouldSendEmail && !isHistorical) {
                try {
                    const dogNames = customer.dog_name_2
                        ? `${customer.dog_name_1} & ${customer.dog_name_2}`
                        : customer.dog_name_1;

                    const emailSubject = booking_type === 'multi_day'
                        ? `Multi-Day Dog Sitting Confirmation - ${dogNames}`
                        : `Booking Confirmation - ${data.service_type}`;

                    const emailContent = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2>Booking Confirmation</h2>
                            <p>Dear ${customer.owner_name},</p>
                            <p>Your booking has been confirmed for ${dogNames}.</p>
                            
                            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>Service:</strong> ${data.service_type}</p>
                                <p><strong>Date & Time:</strong> ${format(startTime, "EEEE, dd MMMM yyyy 'at' HH:mm")}</p>
                                ${booking_type === 'single' ? `<p><strong>Duration:</strong> ${data.duration_minutes} minutes</p>` : `<p><strong>End Time:</strong> ${format(endTime, "EEEE, dd MMMM yyyy 'at' HH:mm")}</p>`}
                                ${finalPrice !== null ? `<p><strong>Price:</strong> £${finalPrice.toFixed(2)}</p>` : ''}
                            </div>
                            
                            <p>We look forward to seeing you and ${dogNames}!</p>
                            
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                            
                            <p style="color: #6b7280; font-size: 14px;">
                                <strong>Hunter's Hounds</strong><br>
                                Professional Dog Walking Service<br>
                                Phone: 07932749772<br>
                                Email: bookings@hunters-hounds.london
                            </p>
                        </div>
                    `;

                    await sendBookingEmail(bookingId, emailSubject, emailContent);
                } catch (emailError) {
                    console.error(`Failed to send booking confirmation emails for booking ${bookingId}:`, emailError);
                    // Don't fail the booking if email fails
                }
            }

            // --- 5. Send Telegram Notification ---
            try {
                const dogNames = customer.dog_name_2
                    ? `${customer.dog_name_1} & ${customer.dog_name_2}`
                    : customer.dog_name_1;

                const telegramMessage = `
${isHistorical ? '📋 HISTORICAL BOOKING ADDED' : '🐕 NEW ADMIN BOOKING'}

📅 ${format(startTime, "EEE, MMM d 'at' HH:mm")} ${booking_type === 'multi_day' ? `→ ${format(endTime, "MMM d 'at' HH:mm")}` : `(${data.duration_minutes}min)`}
👤 ${customer.owner_name} (${customer.phone})
🐾 ${dogNames}
🎯 ${data.service_type}
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