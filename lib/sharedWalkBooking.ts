// lib/sharedWalkBooking.ts - Server-side steps for booking a shared walk.
//
// Used by the single shared-walk endpoint and the series conversion. The data
// model is described in sql/create_shared_walks.sql and lib/sharedWalk.ts.

import type { PoolClient } from "pg";
import { generateCalendarEvent, type CalendarEventData } from "@/lib/calendarEvents";
import { getPool } from "@/lib/database";
import { getCalendar, getCalendarId } from "@/lib/googleCalendar";

export interface Side {
    owner_id: number;
    dog_id: number;
    /** What this household pays for the walk, in pounds. */
    price: number;
}

/** Where a newly created half belongs, when it is part of a recurring series. */
export interface SeriesSlot {
    seriesId: number;
    seriesIndex: number;
}

export interface Half {
    bookingId: number;
    /** Recurring series this booking belongs to, if any. */
    seriesId: number | null;
    seriesIndex: number | null;
    /** True when an existing booking was converted rather than a new one made. */
    converted: boolean;
    oldPrice: number | null;
    price: number;
    googleEventId: string | null;
    cancellationToken: string;
    /** This household's own slot. The two halves can differ: see partnerSlot. */
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    dogName: string;
}

export class Refusal extends Error {
    constructor(message: string, public status = 409) {
        super(message);
    }
}

export type Align = "start" | "end";

export const validDuration = (d: unknown): d is 60 | 120 => d === 60 || d === 120;

/**
 * When the second dog walks, given the first dog's slot.
 *
 * The two walks may be different lengths (1 hour and 2 hours), but the shorter
 * one must sit at one end of the longer one: both set off together, or both
 * come home together. A short walk in the middle of a long one would mean an
 * extra trip to collect and return a dog, at a shared price that does not
 * cover it. Equal lengths always share the same slot.
 */
export function partnerSlot(
    firstStart: Date,
    firstDuration: number,
    partnerDuration: number,
    align: Align
): { start: Date; end: Date } {
    const MIN = 60_000;
    const start =
        align === "end" && partnerDuration !== firstDuration
            ? new Date(firstStart.getTime() + (firstDuration - partnerDuration) * MIN)
            : firstStart;
    return { start, end: new Date(start.getTime() + partnerDuration * MIN) };
}

/** "for the first hour" / "for the last hour", when `other` is the shorter walk. */
export function overlapNote(me: Half, other: Half): string {
    if (other.durationMinutes >= me.durationMinutes) return "";
    return other.startTime.getTime() === me.startTime.getTime() ? "for the first hour" : "for the last hour";
}

export const validSide = (s: Side | undefined): s is Side =>
    !!s && Number.isInteger(s.owner_id) && Number.isInteger(s.dog_id) &&
    typeof s.price === "number" && Number.isFinite(s.price) && s.price >= 0 && s.price < 1000;

/**
 * Give one household its half of the shared walk: convert the walk it already
 * has at this exact time, or create a new booking.
 */
export async function attachSide(
    client: PoolClient,
    side: Side,
    sharedWalkId: number,
    startTime: Date,
    endTime: Date,
    durationMinutes: number,
    status: string,
    /** Series to file a NEW booking under. An existing booking keeps its own. */
    newSeriesSlot?: SeriesSlot
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
                google_event_id, cancellation_token, service_type, series_id, series_index
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
                `${person.owner_name}'s existing walk at that time is ${b.duration_minutes} minutes, not ${durationMinutes}. Choose ${b.duration_minutes} minutes for ${person.dog_name}, or change that booking first.`
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
            seriesId: b.series_id,
            seriesIndex: b.series_index,
            converted: true,
            oldPrice: b.price_pounds === null ? null : Number(b.price_pounds),
            price: side.price,
            googleEventId: b.google_event_id,
            cancellationToken: b.cancellation_token ?? fallbackToken,
            startTime,
            endTime,
            durationMinutes,
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
             price_pounds, booking_type, cancellation_token, status, shared_walk_id,
             series_id, series_index)
         VALUES ($1, $2, 'solo', $3, $4, $5, $6, 'single', $7, $8, $9, $10, $11)
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
            newSeriesSlot?.seriesId ?? null,
            newSeriesSlot?.seriesIndex ?? null,
        ]
    );
    return {
        bookingId: inserted.rows[0].id,
        seriesId: newSeriesSlot?.seriesId ?? null,
        seriesIndex: newSeriesSlot?.seriesIndex ?? null,
        converted: false,
        oldPrice: null,
        price: side.price,
        googleEventId: null,
        cancellationToken,
        startTime,
        endTime,
        durationMinutes,
        ownerName: person.owner_name,
        phone: person.phone,
        email: person.email,
        address: person.address,
        dogName: person.dog_name,
    };
}

/**
 * Bring Google Calendar in line with a shared walk: one event per household,
 * so cancelling one half removes only its own event and the slot stays blocked
 * by the other. Best effort — returns a warning for each event that failed.
 */
export async function syncSharedWalkCalendar(
    halves: Half[],
    opts: { notes?: string; status: string; isHistorical: boolean; seriesTotals?: Record<number, number> }
): Promise<string[]> {
    const warnings: string[] = [];
    const calendar = getCalendar();
    const pool = getPool();

    for (let i = 0; i < halves.length; i++) {
        const half = halves[i];
        const partner = halves[1 - i];
        const seriesTotal = half.seriesId ? opts.seriesTotals?.[half.seriesId] : undefined;
        const eventData: CalendarEventData = {
            service_type: "Shared Walk",
            dogNames: `${half.dogName} (with ${partner.dogName})`,
            ownerName: half.ownerName,
            phone: half.phone,
            email: half.email,
            address: half.address,
            duration_minutes: half.durationMinutes,
            booking_type: "single",
            start_time: half.startTime,
            end_time: half.endTime,
            price: half.price,
            notes: [
                `Shared walk with ${partner.dogName} (${partner.ownerName})${
                    overlapNote(half, partner) ? ` ${overlapNote(half, partner)}` : ""
                }.`,
                opts.notes?.trim(),
            ]
                .filter(Boolean)
                .join(" "),
            status: opts.status,
            isHistorical: opts.isHistorical,
            ...(half.seriesId && half.seriesIndex && seriesTotal
                ? { isRecurring: true, seriesId: half.seriesId, seriesIndex: half.seriesIndex, seriesTotal }
                : {}),
        };
        const event = generateCalendarEvent(eventData, half.startTime, half.endTime);
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
            warnings.push(`Google Calendar was not updated for ${half.dogName}'s booking #${half.bookingId}.`);
        }
    }
    return warnings;
}
