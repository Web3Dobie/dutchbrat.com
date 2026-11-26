import { NextResponse, type NextRequest } from "next/server";
import { format, addMinutes, isPast } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { sendBookingEmail } from "@/lib/emailService";
import { sendTelegramNotification } from "@/lib/telegram";
import { formatDurationForEmail } from "@/lib/emailTemplates";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from "@/lib/database";
import {
    attachSide, syncSharedWalkCalendar, validSide, validDuration, partnerSlot, overlapNote,
    Refusal, type Align, type Half, type Side,
} from "@/lib/sharedWalkBooking";

// Admin only: book a shared walk — two dogs from two households, one walk.
//
// Each household gets its own ordinary booking row, tied together by
// shared_walk_id (see sql/create_shared_walks.sql). If a household ALREADY has
// a walk booked at exactly this time, that booking is turned into its half of
// the shared walk instead of a second one being created, so "add Teddy to
// Marble's Monday walk" and "book a new shared walk" are the same request.

const pool = getPool();
const TIMEZONE = "Europe/London";

interface SharedWalkRequest {
    first: Side;
    second: Side;
    /** When the FIRST client's walk starts (ISO). */
    start_time: string;
    /** Length of the first client's walk. */
    duration_minutes: number;
    /** Length of the second client's walk, if different. Defaults to the first's. */
    second_duration_minutes?: number;
    /** With different lengths: do they set off together or come home together? */
    align?: Align;
    notes?: string;
    create_calendar_event?: boolean;
    send_email?: boolean;
}

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
    const secondDuration = data.second_duration_minutes ?? data.duration_minutes;
    if (!validDuration(data.duration_minutes) || !validDuration(secondDuration)) {
        return NextResponse.json({ error: "A shared walk is 1 hour or 2 hours for each dog." }, { status: 400 });
    }
    if (data.align !== undefined && data.align !== "start" && data.align !== "end") {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const startTime = new Date(data.start_time);
    if (Number.isNaN(startTime.getTime())) {
        return NextResponse.json({ error: "Invalid date or time" }, { status: 400 });
    }
    const endTime = addMinutes(startTime, data.duration_minutes);
    const second = partnerSlot(startTime, data.duration_minutes, secondDuration, data.align ?? "start");
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

        halves = [
            await attachSide(client, data.first, sharedWalkId, startTime, endTime, data.duration_minutes, status),
            await attachSide(client, data.second, sharedWalkId, second.start, second.end, secondDuration, status),
        ];

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

    const whenOf = (h: Half) => format(new TZDate(h.startTime, TIMEZONE), "EEEE, dd MMMM 'at' HH:mm");
    const warnings: string[] = [];

    const wantCalendar = data.create_calendar_event ?? !isHistorical;
    if (wantCalendar) {
        warnings.push(
            ...(await syncSharedWalkCalendar(halves, {
                notes: data.notes,
                status,
                isHistorical,
            }))
        );
    }

    try {
        await sendTelegramNotification(
            [
                `🐕🐕 ${isHistorical ? "HISTORICAL SHARED WALK ADDED" : "SHARED WALK BOOKED"}`,
                "",
                `📅 ${format(new TZDate(startTime, TIMEZONE), "EEE, MMM d")}`,
                ...halves.map(
                    (h) =>
                        `🐾 ${h.dogName} — ${h.ownerName} — ${format(new TZDate(h.startTime, TIMEZONE), "HH:mm")}–${format(new TZDate(h.endTime, TIMEZONE), "HH:mm")} — £${h.price.toFixed(2)} (#${h.bookingId}${h.converted ? ", existing booking" : ""})`
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
            const when = whenOf(half);
            const part = overlapNote(half, partner);
            const subject = half.converted
                ? `Your walk on ${format(new TZDate(half.startTime, TIMEZONE), "EEEE, dd MMMM")} is now a Shared Walk`
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
                <p><strong>Duration:</strong> ${formatDurationForEmail(half.durationMinutes)}</p>
                <p><strong>Walking with:</strong> ${partner.dogName}${part ? ` (${part})` : ""}</p>
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
            start_time: h.startTime.toISOString(),
            duration_minutes: h.durationMinutes,
            converted_existing_booking: h.converted,
        })),
        warnings,
    });
}
