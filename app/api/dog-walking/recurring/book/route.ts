import { NextResponse, type NextRequest } from "next/server";
import { format, parse } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { sendEmail } from "@/lib/emailService";
import { getSoloWalkPrice, getServicePrice } from "@/lib/pricing";
import { normalizeServiceType, getServiceDisplayName } from "@/lib/serviceTypes";
import { generateRecurringBookingEmail } from "@/lib/emailTemplates";
import { generateCalendarEvent, type CalendarEventData } from "@/lib/calendarEvents";
import { getPool } from '@/lib/database';
import { getCalendar, getCalendarId } from '@/lib/googleCalendar';

// --- Configuration ---
const TIMEZONE = "Europe/London";

// --- Database Connection ---
const pool = getPool();

// --- Google Calendar ---
const calendar = getCalendar();

interface BookingDate {
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
}

interface SkippedDate {
    date: string;
    displayDate: string;
    reason: string;
}

interface RecurringBookRequest {
    owner_id: number;
    dog_id_1: number;
    dog_id_2?: number;
    service_type: string;
    duration_minutes: number;
    secondary_address_id?: number;
    recurrence_pattern: 'weekly' | 'biweekly' | 'custom';
    days_of_week?: number[];
    preferred_time: string;
    start_date: string;
    end_date: string;
    confirmed_dates: BookingDate[];
    skipped_dates: SkippedDate[];
    notes?: string;
}

export async function POST(request: NextRequest) {
    const client = await pool.connect();

    try {
        const body: RecurringBookRequest = await request.json();
        const {
            owner_id,
            dog_id_1,
            dog_id_2,
            service_type,
            duration_minutes,
            secondary_address_id,
            recurrence_pattern,
            days_of_week,
            preferred_time,
            start_date,
            end_date,
            confirmed_dates,
            skipped_dates,
            notes,
        } = body;

        // Validate required fields
        if (!owner_id || !dog_id_1 || !service_type || !duration_minutes || !confirmed_dates || confirmed_dates.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields or no confirmed dates" },
                { status: 400 }
            );
        }

        await client.query('BEGIN');

        // Normalize service type
        const normalizedServiceType = normalizeServiceType(service_type);

        // Get owner and dog information
        const ownerResult = await client.query(
            `SELECT o.owner_name, o.email, o.phone, o.address,
                    d1.dog_name AS dog_name_1,
                    d2.dog_name AS dog_name_2
             FROM hunters_hounds.owners o
             JOIN hunters_hounds.dogs d1 ON d1.id = $2
             LEFT JOIN hunters_hounds.dogs d2 ON d2.id = $3
             WHERE o.id = $1`,
            [owner_id, dog_id_1, dog_id_2 || null]
        );

        if (ownerResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: "Owner not found" }, { status: 404 });
        }

        const owner = ownerResult.rows[0];
        const dogNames = owner.dog_name_2
            ? `${owner.dog_name_1} & ${owner.dog_name_2}`
            : owner.dog_name_1;

        // Get address info
        let eventAddress = owner.address;
        let addressLabel = "Primary Address";

        if (secondary_address_id) {
            const addressResult = await client.query(
                `SELECT address, address_label, is_active
                 FROM hunters_hounds.secondary_addresses
                 WHERE id = $1 AND owner_id = $2`,
                [secondary_address_id, owner_id]
            );

            if (addressResult.rows.length > 0 && addressResult.rows[0].is_active) {
                eventAddress = addressResult.rows[0].address;
                addressLabel = addressResult.rows[0].address_label;
            }
        }

        // Calculate price for each booking
        const isSoloWalk = service_type.toLowerCase().includes('solo walk');
        const dogCount = dog_id_2 ? 2 : 1;
        let pricePerBooking: number | null = null;

        if (isSoloWalk && duration_minutes) {
            pricePerBooking = getSoloWalkPrice(duration_minutes, dogCount);
        } else {
            const serviceTypeMap: Record<string, string> = {
                'Meet & Greet - for new clients': 'meetgreet',
                'Solo Walk (60 min)': 'solo',
                'Quick Walk (30 min)': 'quick',
                'Dog Sitting (Variable)': 'sitting'
            };
            const pricingServiceId = serviceTypeMap[service_type];
            if (pricingServiceId) {
                pricePerBooking = getServicePrice(pricingServiceId);
            }
        }

        // 1. Create the booking_series record
        const seriesResult = await client.query(
            `INSERT INTO hunters_hounds.booking_series
             (owner_id, dog_id_1, dog_id_2, service_type, duration_minutes,
              secondary_address_id, recurrence_pattern, days_of_week,
              preferred_time, start_date, end_date,
              total_requested, total_booked, total_skipped, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15)
             RETURNING id`,
            [
                owner_id,
                dog_id_1,
                dog_id_2 || null,
                normalizedServiceType,
                duration_minutes,
                secondary_address_id || null,
                recurrence_pattern,
                days_of_week || null,
                preferred_time,
                start_date,
                end_date,
                confirmed_dates.length + skipped_dates.length,
                confirmed_dates.length,
                skipped_dates.length,
                notes || null,
            ]
        );

        const seriesId = seriesResult.rows[0].id;
        const createdBookings: Array<{
            id: number;
            date: string;
            time: string;
            google_event_id: string;
            cancellation_token: string;
        }> = [];

        // 2. Create individual bookings for each confirmed date
        for (let i = 0; i < confirmed_dates.length; i++) {
            const { date, time } = confirmed_dates[i];
            const [hour, minute] = time.split(':').map(Number);

            // Calculate start and end times
            const startDateTime = new TZDate(date, TIMEZONE);
            startDateTime.setHours(hour, minute, 0, 0);
            const endDateTime = new Date(startDateTime.getTime() + duration_minutes * 60000);

            // Generate cancellation token
            const cancellationToken = crypto.randomUUID();

            // Insert booking
            const bookingResult = await client.query(
                `INSERT INTO hunters_hounds.bookings
                 (owner_id, dog_id_1, dog_id_2, service_type, start_time, end_time,
                  duration_minutes, price_pounds, booking_type, cancellation_token,
                  secondary_address_id, status, series_id, series_index)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'single', $9, $10, 'confirmed', $11, $12)
                 RETURNING id`,
                [
                    owner_id,
                    dog_id_1,
                    dog_id_2 || null,
                    normalizedServiceType,
                    startDateTime.toISOString(),
                    endDateTime.toISOString(),
                    duration_minutes,
                    pricePerBooking,
                    cancellationToken,
                    secondary_address_id || null,
                    seriesId,
                    i + 1,
                ]
            );

            const bookingId = bookingResult.rows[0].id;

            // Generate standardized calendar event using shared utility
            const calendarEventData: CalendarEventData = {
                service_type,
                dogNames,
                ownerName: owner.owner_name,
                phone: owner.phone,
                email: owner.email,
                address: eventAddress,
                addressLabel,
                duration_minutes,
                booking_type: 'single',
                start_time: startDateTime,
                end_time: endDateTime,
                price: pricePerBooking ?? undefined,
                status: 'confirmed',
                isRecurring: true,
                seriesId,
                seriesIndex: i + 1,
                seriesTotal: confirmed_dates.length,
            };

            const event = generateCalendarEvent(calendarEventData, startDateTime, endDateTime, TIMEZONE);

            const calendarResponse = await calendar.events.insert({
                calendarId: getCalendarId(),
                requestBody: event,
            });

            const googleEventId = calendarResponse.data.id || '';

            // Update booking with Google Event ID
            await client.query(
                `UPDATE hunters_hounds.bookings SET google_event_id = $1 WHERE id = $2`,
                [googleEventId, bookingId]
            );

            createdBookings.push({
                id: bookingId,
                date,
                time,
                google_event_id: googleEventId,
                cancellation_token: cancellationToken,
            });
        }

        await client.query('COMMIT');

        // 3. Send confirmation email
        const totalPrice = pricePerBooking ? pricePerBooking * confirmed_dates.length : null;
        const patternDescription = recurrence_pattern === 'weekly'
            ? 'Every week'
            : recurrence_pattern === 'biweekly'
                ? 'Every 2 weeks'
                : `Custom days: ${days_of_week?.map(d => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')}`;

        try {
            const emailResult = generateRecurringBookingEmail({
                ownerName: owner.owner_name,
                dogNames,
                serviceType: service_type,
                patternDescription,
                preferredTime: preferred_time,
                startDate: format(parse(start_date, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy'),
                endDate: format(parse(end_date, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy'),
                confirmedBookings: createdBookings.map(b => ({
                    date: format(parse(b.date, 'yyyy-MM-dd', new Date()), 'EEE d MMM'),
                    time: b.time,
                    cancelUrl: `https://hunters-hounds.com/dog-walking/cancel?token=${b.cancellation_token}`,
                })),
                skippedDates: skipped_dates.map(s => ({
                    date: s.displayDate,
                    reason: s.reason,
                })),
                totalBookings: confirmed_dates.length,
                totalPrice,
                seriesId,
                dashboardUrl: 'https://hunters-hounds.com/my-account',
            });

            await sendEmail({
                to: owner.email,
                subject: emailResult.subject,
                html: emailResult.html,
            });
        } catch (emailError) {
            console.error("Failed to send recurring booking confirmation email:", emailError);
        }

        // 4. Send Telegram notification
        const telegramMessage = `
🔄 NEW RECURRING BOOKING SERIES (#${seriesId})

📅 Pattern: ${patternDescription} at ${preferred_time}
📆 ${format(parse(start_date, 'yyyy-MM-dd', new Date()), 'MMM d')} → ${format(parse(end_date, 'yyyy-MM-dd', new Date()), 'MMM d')}
👤 ${owner.owner_name} (${owner.phone})
🐾 ${dogNames}
🎯 ${confirmed_dates.length} bookings created
${skipped_dates.length > 0 ? `⏭️ ${skipped_dates.length} dates skipped` : ''}
${totalPrice ? `💰 Total: £${totalPrice.toFixed(2)}` : ''}
📍 ${addressLabel}
        `;

        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: process.env.TELEGRAM_CHAT_ID,
                        text: telegramMessage,
                        parse_mode: 'HTML',
                    }),
                });
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
            }
        }

        return NextResponse.json({
            success: true,
            series_id: seriesId,
            bookings_created: createdBookings.length,
            bookings: createdBookings.map(b => ({
                id: b.id,
                date: b.date,
                time: b.time,
            })),
            total_price: totalPrice,
            message: `Successfully created ${createdBookings.length} recurring bookings`,
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating recurring booking:", error);
        return NextResponse.json(
            { error: "Failed to create recurring booking" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
