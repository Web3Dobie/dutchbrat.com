import { NextResponse, type NextRequest } from "next/server";
import { format, addMinutes, isPast } from "date-fns";
import { TZDate } from "@date-fns/tz";
import type { PoolClient } from "pg";
import { sendBookingEmail } from "@/lib/emailService";
import { sendTelegramNotification } from "@/lib/telegram";
import { formatDurationForEmail } from "@/lib/emailTemplates";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { generateCalendarEvent, type CalendarEventData } from "@/lib/calendarEvents";
import { getPool } from "@/lib/database";
import { getCalendar, getCalendarId } from "@/lib/googleCalendar";

// Admin only: book a shared walk — two dogs from two households, one walk.
//
// Each household gets its own ordinary booking row, tied together by
// shared_walk_id (see sql/create_shared_walks.sql). If a household ALREADY has
// a walk booked at exactly this time, that booking is turned into its half of
// the shared walk instead of a second one being created, so "add Teddy to
// Marble's Monday walk" and "book a new shared walk" are the same request.

const pool = getPool();
const TIMEZONE = "Europe/London";

interface Side {
    owner_id: number;
    dog_id: number;
    /** What this household pays for the walk, in pounds. */
    price: number;
}

interface SharedWalkRequest {
    first: Side;
    second: Side;
    start_time: string; // ISO
    duration_minutes: number;
    notes?: string;
    create_calendar_event?: boolean;
    send_email?: boolean;
}

interface Half {
    bookingId: number;
    /** True when an existing booking was converted rather than a new one made. */
    converted: boolean;
    oldPrice: number | null;
    price: number;
    googleEventId: string | null;
    cancellationToken: string;
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    dogName: string;
}

class Refusal extends Error {
    constructor(message: string, public status = 409) {
        super(message);
    }
}

const validSide = (s: Side | undefined): s is Side =>
    !!s && Number.isInteger(s.owner_id) && Number.isInteger(s.dog_id) &&
    typeof s.price === "number" && Number.isFinite(s.price) && s.price >= 0 && s.price < 1000;

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    let data: SharedWalkRequest;
    try {
        data = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!validSide(data.first) || !validSide(data.second) || !data.start_time) {
        return NextResponse.json(
            { error: "Both clients need a dog and a price, and the walk needs a date and time." },
            { status: 400 }
        );
    }
    if (data.first.owner_id === data.second.owner_id) {
        return NextResponse.json(
            { error: "A shared walk is for two different clients. For two dogs from one home, book a normal walk with both dogs." },
            { status: 400 }
        );
    }
    if (data.duration_minutes !== 60 && data.duration_minutes !== 120) {
        return NextResponse.json({ error: "A shared walk is 1 hour or 2 hours." }, { status: 400 });
    }

    const startTime = new Date(data.start_time);
    if (Number.isNaN(startTime.getTime())) {
        return NextResponse.json({ error: "Invalid date or time" }, { status: 400 });
    }
    const endTime = addMinutes(startTime, data.duration_minutes);
    const isHistorical = isPast(startTime);
    const status = isHistorical ? "completed" : "confirmed";

    const client = await pool.connect();
    let halves: Half[];
    let sharedWalkId: number;

    try {
        await client.query("BEGIN");

        const shared = await client.query(
            `INSERT INTO hunters_hounds.shared_walks (created_by, notes) VALUES ('admin', $1) RETURNING id`,
            [data.notes?.trim() || null]
        );
        sharedWalkId = shared.rows[0].id;

        halves = [];
        for (const side of [data.first, data.second]) {
            halves.push(await attachSide(client, side, sharedWalkId, startTime, endTime, data.duration_minutes, status));
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        client.release();
        if (error instanceof Refusal) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Shared walk booking failed:", error);
        return NextResponse.json({ error: "Failed to book the shared walk. Nothing was changed." }, { status: 500 });
    }
    client.release();

    // --- Everything below is best effort: the bookings already exist. ---

    const when = format(new TZDate(startTime, TIMEZONE), "EEEE, dd MMMM 'at' HH:mm");
    const warnings: string[] = [];

    // Google Calendar: one event per household, so cancelling one half removes
    // only its own event and the slot stays blocked by the other.
    const wantCalendar = data.create_calendar_event ?? !isHistorical;
    if (wantCalendar) {
        const calendar = getCalendar();
        for (let i = 0; i < halves.length; i++) {
            const half = halves[i];
            const partner = halves[1 - i];
            const eventData: CalendarEventData = {
                service_type: "Shared Walk",
                dogNames: `${half.dogName} (with ${partner.dogName})`,
                ownerName: half.ownerName,
                phone: half.phone,
                email: half.email,
                address: half.address,
                duration_minutes: data.duration_minutes,
                booking_type: "single",
                start_time: startTime,
                end_time: endTime,
                price: half.price,
                notes: [`Shared walk with ${partner.dogName} (${partner.ownerName}).`, data.notes?.trim()]
                    .filter(Boolean)
                    .join(" "),
                status,
                isHistorical,
            };
            const event = generateCalendarEvent(eventData, startTime, endTime);
            try {
                if (half.googleEventId) {
                    await calendar.events.patch({
                        calendarId: getCalendarId(),
                        eventId: half.googleEventId,
                        requestBody: { summary: event.summary, description: event.description },
                    });
                } else {
                    const created = await calendar.events.insert({
                        calendarId: getCalendarId(),
                        requestBody: event,
                    });
                    if (created.data.id) {
                        half.googleEventId = created.data.id;
                        await pool.query(
                            `UPDATE hunters_hounds.bookings SET google_event_id = $1 WHERE id = $2`,
                            [created.data.id, half.bookingId]
                        );
                    }
                }
            } catch (calendarError) {
                console.error(`Shared walk: calendar update failed for booking ${half.bookingId}:`, calendarError);
                warnings.push(`Google Calendar was not updated for ${half.dogName}'s booking.`);
            }
        }
    }

    try {
        await sendTelegramNotification(
            [
                `🐕🐕 ${isHistorical ? "HISTORICAL SHARED WALK ADDED" : "SHARED WALK BOOKED"}`,
                "",
                `📅 ${format(new TZDate(startTime, TIMEZONE), "EEE, MMM d 'at' HH:mm")} (${data.duration_minutes}min)`,
                ...halves.map(
                    (h) =>
                        `🐾 ${h.dogName} — ${h.ownerName} — £${h.price.toFixed(2)} (#${h.bookingId}${h.converted ? ", existing booking" : ""})`
                ),
                data.notes?.trim() ? `📝 ${data.notes.trim()}` : "",
            ]
                .filter((l, i) => l !== "" || i === 1)
                .join("\n")
        );
    } catch (telegramError) {
        console.error("Shared walk: Telegram notification failed:", telegramError);
    }

    if (data.send_email && !isHistorical) {
        for (let i = 0; i < halves.length; i++) {
            const half = halves[i];
            const partner = halves[1 - i];
            const priceChanged = half.converted && half.oldPrice !== null && half.oldPrice !== half.price;
            const subject = half.converted
                ? `Your walk on ${format(new TZDate(startTime, TIMEZONE), "EEEE, dd MMMM")} is now a Shared Walk`
                : `Hunter's Hounds Shared Walk Confirmed: ${when}`;
            const html = `
                <h1>${half.converted ? "Your walk is now a Shared Walk" : "Shared Walk Confirmed!"}</h1>
                <p>Hi ${half.ownerName},</p>
                <p>${
                    half.converted
                        ? `As we discussed, <strong>${half.dogName}</strong>'s walk will be shared with <strong>${partner.dogName}</strong>.`
                        : `<strong>${half.dogName}</strong> is booked on a <strong>Shared Walk</strong> with <strong>${partner.dogName}</strong>.`
                }</p>
                <p><strong>Date & Time:</strong> ${when}</p>
                <p><strong>Duration:</strong> ${formatDurationForEmail(data.duration_minutes)}</p>
                <p><strong>Walking with:</strong> ${partner.dogName}</p>
                <p><strong>Your price:</strong> £${half.price.toFixed(2)}${
                    priceChanged ? ` (was £${half.oldPrice!.toFixed(2)})` : ""
                }</p>
                <p>A shared walk is two dogs from two homes walking together. If either of you needs to change the time, just message me and I'll arrange it with both households.</p>
                <br>
                <p><strong>Manage Your Booking:</strong></p>
                <a href="https://hunters-hounds.london/my-account" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #3b82f6; border-radius: 4px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">
                    View Dashboard
                </a>
                <p>If you need to cancel this appointment, please click the button below:</p>
                <a href="https://hunters-hounds.london/dog-walking/cancel?token=${half.cancellationToken}" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #ef4444; border-radius: 4px; text-decoration: none;">
                    Cancel Booking
                </a>
                <br><br>
                <p><strong>Cancellation Policy:</strong> Walks can be cancelled at any time, even on the same day, with no fee.</p>
                <p>Thank you!</p>
            `;
            try {
                await sendBookingEmail(half.bookingId, subject, html);
            } catch (emailError) {
                console.error(`Shared walk: email failed for booking ${half.bookingId}:`, emailError);
                warnings.push(`The confirmation email to ${half.ownerName} was not sent.`);
            }
        }
    }

    return NextResponse.json({
        success: true,
        shared_walk_id: sharedWalkId,
        bookings: halves.map((h) => ({
            booking_id: h.bookingId,
            owner_name: h.ownerName,
            dog_name: h.dogName,
            price: h.price,
            converted_existing_booking: h.converted,
        })),
        warnings,
    });
}

/**
 * Give one household its half of the shared walk: convert the walk it already
 * has at this exact time, or create a new booking.
 */
async function attachSide(
    client: PoolClient,
    side: Side,
    sharedWalkId: number,
    startTime: Date,
    endTime: Date,
    durationMinutes: number,
    status: string
): Promise<Half> {
    const who = await client.query(
        `SELECT o.owner_name, o.phone, o.email, o.address, d.dog_name
           FROM hunters_hounds.owners o
           JOIN hunters_hounds.dogs d ON d.owner_id = o.id AND d.id = $2
          WHERE o.id = $1`,
        [side.owner_id, side.dog_id]
    );
    if (who.rows.length === 0) {
        throw new Refusal("Client or dog not found.", 404);
    }
    const person = who.rows[0];

    const existing = await client.query(
        `SELECT id, dog_id_1, dog_id_2, duration_minutes, price_pounds, shared_walk_id,
                google_event_id, cancellation_token, service_type
           FROM hunters_hounds.bookings
          WHERE owner_id = $1
            AND start_time = $2
            AND status IN ('confirmed', 'completed', 'completed & paid')
          FOR UPDATE`,
        [side.owner_id, startTime.toISOString()]
    );

    if (existing.rows.length > 1) {
        throw new Refusal(`${person.owner_name} has more than one booking at that time. Tidy that up first.`);
    }

    if (existing.rows.length === 1) {
        const b = existing.rows[0];
        if (b.shared_walk_id) {
            throw new Refusal(`${person.owner_name}'s walk at that time is already a shared walk.`);
        }
        if (b.service_type !== "solo") {
            throw new Refusal(`${person.owner_name} already has a different kind of booking at that time.`);
        }
        if (b.dog_id_2 || b.dog_id_1 !== side.dog_id) {
            throw new Refusal(
                `${person.owner_name}'s existing walk at that time is not for ${person.dog_name} alone. Change that booking first.`
            );
        }
        if (b.duration_minutes !== durationMinutes) {
            throw new Refusal(
                `${person.owner_name}'s existing walk at that time is ${b.duration_minutes} minutes, not ${durationMinutes}. Change one of them so they match.`
            );
        }
        // Very old bookings have no cancellation link; give this one a link now.
        const fallbackToken = globalThis.crypto.randomUUID();
        await client.query(
            `UPDATE hunters_hounds.bookings
                SET shared_walk_id = $1, price_pounds = $2, updated_at = CURRENT_TIMESTAMP,
                    cancellation_token = COALESCE(cancellation_token, $4)
              WHERE id = $3`,
            [sharedWalkId, side.price, b.id, fallbackToken]
        );
        return {
            bookingId: b.id,
            converted: true,
            oldPrice: b.price_pounds === null ? null : Number(b.price_pounds),
            price: side.price,
            googleEventId: b.google_event_id,
            cancellationToken: b.cancellation_token ?? fallbackToken,
            ownerName: person.owner_name,
            phone: person.phone,
            email: person.email,
            address: person.address,
            dogName: person.dog_name,
        };
    }

    const cancellationToken = globalThis.crypto.randomUUID();
    const inserted = await client.query(
        `INSERT INTO hunters_hounds.bookings
            (owner_id, dog_id_1, service_type, start_time, end_time, duration_minutes,
             price_pounds, booking_type, cancellation_token, status, shared_walk_id)
         VALUES ($1, $2, 'solo', $3, $4, $5, $6, 'single', $7, $8, $9)
         RETURNING id`,
        [
            side.owner_id,
            side.dog_id,
            startTime.toISOString(),
            endTime.toISOString(),
            durationMinutes,
            side.price,
            cancellationToken,
            status,
            sharedWalkId,
        ]
    );
    return {
        bookingId: inserted.rows[0].id,
        converted: false,
        oldPrice: null,
        price: side.price,
        googleEventId: null,
        cancellationToken,
        ownerName: person.owner_name,
        phone: person.phone,
        email: person.email,
        address: person.address,
        dogName: person.dog_name,
    };
}
