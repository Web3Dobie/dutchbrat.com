import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendBookingEmail } from "@/lib/emailService";
import { getSoloWalkPrice, getQuickWalkPrice } from "@/lib/pricing";
import { getServiceDisplayName } from "@/lib/serviceTypes";
import { getPool } from "@/lib/database";
import { getCalendar, getCalendarId } from "@/lib/googleCalendar";
import { TRAVEL_BUFFER } from "@/lib/constants";
import { isoDayOfWeek, shiftWithinWeek } from "@/lib/seriesSchedule";

const TIMEZONE = "Europe/London";
const pool = getPool();
const calendar = getCalendar();

interface RouteParams {
    params: Promise<{ seriesId: string }>;
}

interface AmendRequest {
    /** New weekday(s), 1=Mon … 5=Fri. Must be the same count as the series has now. */
    days_of_week?: number[] | null;
    /** New start time, 'HH:mm'. */
    preferred_time?: string | null;
    /** New walk length in minutes. */
    duration_minutes?: number | null;
    /** true = report what would happen and change nothing. */
    dry_run?: boolean;
    /** Email the client one summary of the change. Defaults to true. */
    notify_client?: boolean;
}

interface PlannedMove {
    booking_id: number;
    series_index: number | null;
    from: string;
    to: string;
    new_start: string;
    new_end: string;
    new_price: number | null;
    blocked: boolean;
    blocked_by: string | null;
    warnings: string[];
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    const { seriesId } = await params;
    const seriesIdNum = parseInt(seriesId);
    if (isNaN(seriesIdNum)) {
        return NextResponse.json({ error: "Invalid series ID" }, { status: 400 });
    }

    const body: AmendRequest = await request.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const notifyClient = body.notify_client !== false;

    if (
        (body.days_of_week == null || body.days_of_week.length === 0) &&
        !body.preferred_time &&
        !body.duration_minutes
    ) {
        return NextResponse.json(
            { error: "Nothing to change: give days_of_week, preferred_time or duration_minutes" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const seriesResult = await client.query(
            `SELECT bs.*, o.owner_name, o.email, o.phone, o.address, o.extended_travel_time,
                    d1.dog_name AS dog_name_1, d2.dog_name AS dog_name_2
             FROM hunters_hounds.booking_series bs
             JOIN hunters_hounds.owners o ON bs.owner_id = o.id
             JOIN hunters_hounds.dogs d1 ON bs.dog_id_1 = d1.id
             LEFT JOIN hunters_hounds.dogs d2 ON bs.dog_id_2 = d2.id
             WHERE bs.id = $1`,
            [seriesIdNum]
        );

        if (seriesResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Series not found" }, { status: 404 });
        }

        const series = seriesResult.rows[0];

        if (series.status === "cancelled") {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "This series is cancelled; nothing to amend" },
                { status: 409 }
            );
        }

        const storedDays: number[] = series.days_of_week ?? [];
        const newDays: number[] | null =
            body.days_of_week && body.days_of_week.length > 0
                ? [...body.days_of_week].sort((a, b) => a - b)
                : null;

        const newDuration: number | null = body.duration_minutes ?? null;
        const newTime: string | null = body.preferred_time ?? null;

        // Only bookings still to come. Anything in the past, completed, paid or
        // already cancelled is history and stays untouched.
        const futureResult = await client.query(
            `SELECT id, series_index, start_time, end_time, duration_minutes, service_type,
                    dog_id_1, dog_id_2, google_event_id, price_pounds
             FROM hunters_hounds.bookings
             WHERE series_id = $1
               AND status = 'confirmed'
               AND start_time > NOW()
             ORDER BY start_time`,
            [seriesIdNum]
        );

        if (futureResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "No upcoming bookings in this series to amend" },
                { status: 409 }
            );
        }

        // days_of_week is only populated for 'custom' series. A plain weekly
        // series stores {} and keeps its weekday ONLY in its bookings, which is
        // most of them — so derive the real weekdays from the bookings when the
        // column is empty. Without this, asking to move a weekly series from
        // Friday to Thursday would map nothing and silently do nothing.
        const observedDays = Array.from(
            new Set<number>(
                futureResult.rows.map((r) => isoDayOfWeek(new Date(r.start_time), TIMEZONE))
            )
        ).sort((a, b) => a - b);

        const effectiveDays = storedDays.length > 0
            ? [...storedDays].sort((a, b) => a - b)
            : observedDays;

        // Positional mapping only. For a single-day series this is exactly
        // "the Friday walks become Thursday walks, same weeks". Changing the
        // NUMBER of days a week is a structural change — the right move is to
        // cancel and recreate, not to guess which walks to invent or drop.
        if (newDays && newDays.length !== effectiveDays.length) {
            await client.query("ROLLBACK");
            const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            return NextResponse.json(
                {
                    error:
                        `This series runs on ${effectiveDays.length} day(s) a week ` +
                        `(${effectiveDays.map((d) => dayNames[d]).join(", ")}) and you have asked for ` +
                        `${newDays.length}. Changing how many days a week a series runs is not an amend — ` +
                        `cancel the series and create a new one.`,
                },
                { status: 400 }
            );
        }

        const dayMap = new Map<number, number>();
        if (newDays) effectiveDays.forEach((d, i) => dayMap.set(d, newDays[i]));

        const ownBookingIds = futureResult.rows.map((r) => Number(r.id));
        const isSoloWalk = String(series.service_type || "").toLowerCase().includes("solo");
        const dogCount = series.dog_id_2 ? 2 : 1;
        const ownBuffer = series.extended_travel_time
            ? TRAVEL_BUFFER.extended
            : TRAVEL_BUFFER.standard;

        const planned: PlannedMove[] = [];

        for (const b of futureResult.rows) {
            const existingStart = new Date(b.start_time);
            const duration = newDuration ?? b.duration_minutes ?? series.duration_minutes ?? 60;

            // Same week, possibly a different weekday, possibly a different time.
            const existingDow = isoDayOfWeek(existingStart, TIMEZONE);
            const targetDow = dayMap.get(existingDow) ?? existingDow;

            const newStartUtc = shiftWithinWeek(existingStart, {
                targetDow,
                time: newTime,
                timeZone: TIMEZONE,
            });
            const newEndUtc = new Date(newStartUtc.getTime() + duration * 60000);

            // Price on the NEW date: a move across 1 Jan reprices correctly.
            // Series service_type is normalised ('solo' | 'quick'). Quick walks
            // are priced by dog count too, so getServicePrice is not enough.
            // Anything unrecognised keeps the price it already had rather than
            // being given an invented one.
            let newPrice: number | null = b.price_pounds == null ? null : Number(b.price_pounds);
            if (isSoloWalk) {
                const p = getSoloWalkPrice(duration, dogCount, newStartUtc);
                if (p > 0) newPrice = p;
            } else if (String(series.service_type).toLowerCase().includes("quick")) {
                const p = getQuickWalkPrice(dogCount, newStartUtc);
                if (p > 0) newPrice = p;
            } else {
                console.warn(
                    `[Series Amend] no pricing rule for service_type='${series.service_type}' ` +
                    `on booking ${b.id}; leaving price_pounds unchanged`
                );
            }

            // Blocking conflicts: true overlap with a booking outside this
            // series. Matches the single-booking admin reschedule rather than
            // the stricter client-facing availability, so the tool does not
            // refuse a move the admin would happily make by hand.
            const conflictResult = await client.query(
                `SELECT b.id, b.start_time, b.end_time, b.service_type, b.duration_minutes,
                        o.owner_name, o.extended_travel_time
                 FROM hunters_hounds.bookings b
                 JOIN hunters_hounds.owners o ON o.id = b.owner_id
                 WHERE b.id <> ALL($1::int[])
                   AND b.status = 'confirmed'
                   AND (
                        (b.start_time <= $2 AND b.end_time > $2) OR
                        (b.start_time < $3 AND b.end_time >= $3) OR
                        (b.start_time >= $2 AND b.end_time <= $3)
                   )`,
                [ownBookingIds, newStartUtc.toISOString(), newEndUtc.toISOString()]
            );

            const amendingIsSitting = String(series.service_type || "")
                .toLowerCase()
                .includes("sitting");

            const blockers = conflictResult.rows.filter((row) => {
                const st = String(row.service_type || "").toLowerCase();
                const isSitting = st.includes("sitting");
                const isWalk =
                    st.includes("walk") ||
                    st.includes("solo") ||
                    st.includes("quick") ||
                    st.includes("meet");

                // A long or multi-day sitting coexists with walks, both ways.
                if (amendingIsSitting && isWalk) return false;
                if (isSitting) {
                    const hours =
                        (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) /
                        3600000;
                    if (hours >= 6) return false;
                }
                return true;
            });

            // Travel buffers warn but do not block: the admin may legitimately
            // want two walks closer together than the client-facing rules allow.
            const warnings: string[] = [];
            const neighbourResult = await client.query(
                `SELECT b.id, b.start_time, b.end_time, o.owner_name, o.extended_travel_time
                 FROM hunters_hounds.bookings b
                 JOIN hunters_hounds.owners o ON o.id = b.owner_id
                 WHERE b.id <> ALL($1::int[])
                   AND b.status = 'confirmed'
                   AND b.start_time < $3
                   AND b.end_time > $2`,
                [
                    ownBookingIds,
                    new Date(newStartUtc.getTime() - 60 * 60000).toISOString(),
                    new Date(newEndUtc.getTime() + 60 * 60000).toISOString(),
                ]
            );

            for (const n of neighbourResult.rows) {
                const nStart = new Date(n.start_time);
                const nEnd = new Date(n.end_time);
                const needed = Math.max(
                    ownBuffer,
                    n.extended_travel_time ? TRAVEL_BUFFER.extended : TRAVEL_BUFFER.standard
                );
                const gapBefore = (newStartUtc.getTime() - nEnd.getTime()) / 60000;
                const gapAfter = (nStart.getTime() - newEndUtc.getTime()) / 60000;
                const gap = gapBefore >= 0 ? gapBefore : gapAfter >= 0 ? gapAfter : null;
                if (gap !== null && gap < needed) {
                    warnings.push(
                        `only ${Math.round(gap)} min from ${n.owner_name} (needs ${needed})`
                    );
                }
            }

            planned.push({
                booking_id: Number(b.id),
                series_index: b.series_index ?? null,
                from: format(new TZDate(existingStart, TIMEZONE), "EEE d MMM yyyy HH:mm"),
                to: format(new TZDate(newStartUtc, TIMEZONE), "EEE d MMM yyyy HH:mm"),
                new_start: newStartUtc.toISOString(),
                new_end: newEndUtc.toISOString(),
                new_price: newPrice,
                blocked: blockers.length > 0,
                blocked_by: blockers.length
                    ? blockers
                          .map((r) => `${r.owner_name} (#${r.id})`)
                          .join(", ")
                    : null,
                warnings,
            });
        }

        const movable = planned.filter((p) => !p.blocked);
        const blocked = planned.filter((p) => p.blocked);

        // Dry run: say what would happen, change nothing.
        if (dryRun) {
            await client.query("ROLLBACK");
            return NextResponse.json({
                dry_run: true,
                series_id: seriesIdNum,
                owner_name: series.owner_name,
                dog_names: series.dog_name_2
                    ? `${series.dog_name_1} & ${series.dog_name_2}`
                    : series.dog_name_1,
                total: planned.length,
                movable: movable.length,
                blocked: blocked.length,
                moves: planned,
            });
        }

        if (movable.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                {
                    error: "Every upcoming booking in this series clashes with something else; nothing moved",
                    moves: planned,
                },
                { status: 409 }
            );
        }

        // Apply: move what fits, leave the clashes where they are.
        for (const move of movable) {
            await client.query(
                `UPDATE hunters_hounds.bookings
                 SET start_time = $2, end_time = $3, duration_minutes = $4, price_pounds = $5
                 WHERE id = $1`,
                [
                    move.booking_id,
                    move.new_start,
                    move.new_end,
                    newDuration ?? series.duration_minutes,
                    move.new_price,
                ]
            );
        }

        // Keep the series definition in step, so a later amend starts from the
        // right place and the dashboard shows the real pattern.
        await client.query(
            `UPDATE hunters_hounds.booking_series
             SET days_of_week = COALESCE($2, days_of_week),
                 preferred_time = COALESCE($3::time, preferred_time),
                 duration_minutes = COALESCE($4, duration_minutes)
             WHERE id = $1`,
            [seriesIdNum, newDays, newTime, newDuration]
        );

        await client.query("COMMIT");

        const dogNames = series.dog_name_2
            ? `${series.dog_name_1} & ${series.dog_name_2}`
            : series.dog_name_1;
        const serviceDisplayName = getServiceDisplayName(series.service_type);

        // Calendar patches after the commit: a Google failure must not undo a
        // correct database change.
        const calendarFailures: number[] = [];
        for (const move of movable) {
            const row = futureResult.rows.find((r) => Number(r.id) === move.booking_id);
            if (!row?.google_event_id) continue;
            try {
                await calendar.events.patch({
                    calendarId: getCalendarId(),
                    eventId: row.google_event_id,
                    requestBody: {
                        summary: `${serviceDisplayName} - ${dogNames} (${series.owner_name})`,
                        start: { dateTime: move.new_start, timeZone: TIMEZONE },
                        end: { dateTime: move.new_end, timeZone: TIMEZONE },
                    },
                });
            } catch (e) {
                console.error(`[Series Amend] calendar patch failed for ${move.booking_id}`, e);
                calendarFailures.push(move.booking_id);
            }
        }

        // One summary email for the whole series, not one per booking.
        if (notifyClient) {
            try {
                const rowsHtml = movable
                    .map(
                        (m) =>
                            `<tr><td style="padding:4px 10px 4px 0;color:#6b7280;">${m.from}</td>` +
                            `<td style="padding:4px 0;"><strong>${m.to}</strong></td></tr>`
                    )
                    .join("");

                const blockedHtml = blocked.length
                    ? `<p style="color:#92400e;">${blocked.length} walk(s) could not be moved and are unchanged for now — I will be in touch about those.</p>`
                    : "";

                await sendBookingEmail(
                    movable[0].booking_id,
                    `Your recurring ${serviceDisplayName.toLowerCase()} has moved`,
                    `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color:#059669;">Your regular walks have moved</h2>
                      <p>Dear ${series.owner_name},</p>
                      <p>I have updated your recurring ${serviceDisplayName.toLowerCase()} for ${dogNames}.
                         Here are the new times:</p>
                      <table style="border-collapse:collapse;margin:16px 0;">${rowsHtml}</table>
                      ${blockedHtml}
                      <p>Everything else about the booking stays the same. Just reply if any of these
                         do not suit and I will sort it out.</p>
                      <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;">
                      <p style="color:#6b7280;font-size:14px;">
                        <strong>Hunter's Hounds</strong><br>
                        Phone: 07932749772<br>
                        Email: bookings@hunters-hounds.london
                      </p>
                    </div>`
                );
            } catch (e) {
                console.error("[Series Amend] summary email failed", e);
            }
        }

        try {
            await sendTelegramNotification(
                `🔁 **SERIES AMENDED** (#${seriesIdNum})\n\n` +
                    `**Client:** ${series.owner_name}\n` +
                    `**Dogs:** ${dogNames}\n` +
                    `**Moved:** ${movable.length} of ${planned.length}\n` +
                    (blocked.length ? `**Left alone (clash):** ${blocked.length}\n` : "") +
                    (calendarFailures.length
                        ? `**Calendar patch failed:** ${calendarFailures.length}\n`
                        : "") +
                    (notifyClient ? `**Client emailed:** yes` : `**Client emailed:** no`)
            );
        } catch (e) {
            console.error("[Series Amend] telegram failed", e);
        }

        return NextResponse.json({
            success: true,
            series_id: seriesIdNum,
            moved: movable.length,
            left_alone: blocked.length,
            calendar_failures: calendarFailures,
            client_emailed: notifyClient,
            moves: planned,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Series amend error:", error);
        return NextResponse.json(
            { error: "Failed to amend series. Please try again." },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
