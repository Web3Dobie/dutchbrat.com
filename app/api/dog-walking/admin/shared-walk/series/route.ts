import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { sendBookingEmail } from "@/lib/emailService";
import { sendTelegramNotification } from "@/lib/telegram";
import { formatDurationForEmail } from "@/lib/emailTemplates";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from "@/lib/database";
import { getPooledWalkPrice } from "@/lib/pricing";
import { attachSide, syncSharedWalkCalendar, Refusal, type Half } from "@/lib/sharedWalkBooking";

// Admin only: turn every upcoming walk of a recurring series into a shared
// walk with a second household.
//
// The series' own bookings become shared; the partner gets a booking at each
// of the same times, filed under a new series of their own so that they can
// see and cancel it as a series like any other. A partner who already has a
// walk at one of those exact times has that walk converted instead.
//
// dry_run does all of the database work and then rolls it back, so the preview
// is exactly what the real run will do.

const pool = getPool();
const TIMEZONE = "Europe/London";

interface SeriesShareRequest {
    series_id: number;
    partner: { owner_id: number; dog_id: number };
    /** Per walk, for the series' own client. Omit to use the rate card's shared price for each date. */
    price_first?: number | null;
    /** Per walk, for the partner. Omit to use the rate card's shared price for each date. */
    price_second?: number | null;
    send_email?: boolean;
    dry_run?: boolean;
}

interface PlannedWalk {
    start: Date;
    end: Date;
    halves: [Half, Half];
}

const optionalPrice = (v: unknown): v is number | null | undefined =>
    v === null || v === undefined || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1000);

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    let data: SeriesShareRequest;
    try {
        data = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (
        !Number.isInteger(data.series_id) ||
        !data.partner || !Number.isInteger(data.partner.owner_id) || !Number.isInteger(data.partner.dog_id) ||
        !optionalPrice(data.price_first) || !optionalPrice(data.price_second)
    ) {
        return NextResponse.json({ error: "Choose the series, the second client and their dog." }, { status: 400 });
    }

    const dryRun = data.dry_run === true;
    const client = await pool.connect();

    let walks: PlannedWalk[] = [];
    let partnerSeriesId: number | null = null;
    let createdForPartner = 0;
    let duration = 0;
    let sourceSeriesTotal = 0;
    const warnings: string[] = [];

    try {
        await client.query("BEGIN");

        const seriesResult = await client.query(
            `SELECT bs.*, o.owner_name
               FROM hunters_hounds.booking_series bs
               JOIN hunters_hounds.owners o ON o.id = bs.owner_id
              WHERE bs.id = $1
              FOR UPDATE OF bs`,
            [data.series_id]
        );
        if (seriesResult.rows.length === 0) throw new Refusal("Series not found.", 404);
        const series = seriesResult.rows[0];

        if (series.status !== "active") throw new Refusal("That series is not active.");
        if (series.service_type !== "solo" || series.dog_id_2) {
            throw new Refusal("Only a solo-walk series with one dog can be shared.");
        }
        if (series.duration_minutes !== 60 && series.duration_minutes !== 120) {
            throw new Refusal("A shared walk is 1 hour or 2 hours; this series is neither.");
        }
        if (series.owner_id === data.partner.owner_id) {
            throw new Refusal("A shared walk is for two different clients.", 400);
        }
        duration = series.duration_minutes;
        sourceSeriesTotal = series.total_booked;

        const upcoming = await client.query(
            `SELECT id, start_time, end_time
               FROM hunters_hounds.bookings
              WHERE series_id = $1 AND status = 'confirmed' AND start_time > NOW()
                AND shared_walk_id IS NULL
              ORDER BY start_time
              FOR UPDATE`,
            [data.series_id]
        );
        if (upcoming.rows.length === 0) {
            throw new Refusal("This series has no upcoming walks that are not already shared.");
        }

        // What each household pays for each walk: the figure given, or the rate
        // card's shared price for that walk's own date.
        const priceFor = (given: number | null | undefined, start: Date): number => {
            if (given !== null && given !== undefined) return given;
            const card = getPooledWalkPrice(duration, start);
            if (card === null) {
                throw new Refusal(
                    `The rate card has no shared-walk price for ${format(new TZDate(start, TIMEZONE), "d MMMM yyyy")}. Enter the price per walk for both clients.`,
                    400
                );
            }
            return card;
        };

        const first = new Date(upcoming.rows[0].start_time);
        const last = new Date(upcoming.rows[upcoming.rows.length - 1].start_time);
        const londonDay = (d: Date) => format(new TZDate(d, TIMEZONE), "yyyy-MM-dd");

        const partnerSeries = await client.query(
            `INSERT INTO hunters_hounds.booking_series
                (owner_id, dog_id_1, service_type, duration_minutes, recurrence_pattern, days_of_week,
                 preferred_time, start_date, end_date, total_requested, total_booked, status, notes)
             VALUES ($1, $2, 'solo', $3, $4, $5, $6, $7, $8, 0, 0, 'active', $9)
             RETURNING id`,
            [
                data.partner.owner_id,
                data.partner.dog_id,
                duration,
                series.recurrence_pattern,
                series.days_of_week,
                series.preferred_time,
                londonDay(first),
                londonDay(last),
                `Shared walks with series #${series.id} (${series.owner_name})`,
            ]
        );
        partnerSeriesId = partnerSeries.rows[0].id as number;

        for (const row of upcoming.rows) {
            const start = new Date(row.start_time);
            const end = new Date(row.end_time);

            const shared = await client.query(
                `INSERT INTO hunters_hounds.shared_walks (created_by, notes) VALUES ('admin', $1) RETURNING id`,
                [`Series #${series.id}`]
            );
            const sharedWalkId = shared.rows[0].id as number;

            const a = await attachSide(
                client,
                { owner_id: series.owner_id, dog_id: series.dog_id_1, price: priceFor(data.price_first, start) },
                sharedWalkId, start, end, duration, "confirmed"
            );
            const b = await attachSide(
                client,
                { owner_id: data.partner.owner_id, dog_id: data.partner.dog_id, price: priceFor(data.price_second, start) },
                sharedWalkId, start, end, duration, "confirmed",
                { seriesId: partnerSeriesId, seriesIndex: createdForPartner + 1 }
            );
            if (!b.converted) createdForPartner++;
            walks.push({ start, end, halves: [a, b] });
        }

        if (createdForPartner === 0) {
            // Every walk was one the partner already had; no series needed.
            await client.query(`DELETE FROM hunters_hounds.booking_series WHERE id = $1`, [partnerSeriesId]);
            partnerSeriesId = null;
        } else {
            await client.query(
                `UPDATE hunters_hounds.booking_series SET total_requested = $1, total_booked = $1 WHERE id = $2`,
                [createdForPartner, partnerSeriesId]
            );
        }
        await client.query(
            `UPDATE hunters_hounds.booking_series
                SET notes = concat_ws(' ', NULLIF(notes, ''), $1::text)
              WHERE id = $2`,
            [`Shared with ${walks[0].halves[1].dogName} (${walks[0].halves[1].ownerName}).`, series.id]
        );

        // Anything else the partner has booked that collides with these walks.
        // Not refused (the admin may know better), but said out loud.
        const clashes = await client.query(
            `SELECT DISTINCT pb.id, pb.start_time
               FROM hunters_hounds.bookings pb
               JOIN unnest($2::timestamptz[], $3::timestamptz[]) AS slot(s, e)
                 ON pb.start_time < slot.e AND pb.end_time > slot.s
              WHERE pb.owner_id = $1 AND pb.status = 'confirmed' AND pb.id <> ALL($4::int[])
              ORDER BY pb.start_time`,
            [
                data.partner.owner_id,
                walks.map((w) => w.start.toISOString()),
                walks.map((w) => w.end.toISOString()),
                walks.map((w) => w.halves[1].bookingId),
            ]
        );
        for (const c of clashes.rows) {
            warnings.push(
                `${walks[0].halves[1].ownerName} also has booking #${c.id} on ${format(new TZDate(new Date(c.start_time), TIMEZONE), "EEE d MMM 'at' HH:mm")}, which overlaps one of these walks.`
            );
        }

        await client.query(dryRun ? "ROLLBACK" : "COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        client.release();
        if (error instanceof Refusal) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Shared series conversion failed:", error);
        return NextResponse.json({ error: "Failed to share the series. Nothing was changed." }, { status: 500 });
    }
    client.release();

    const [firstOwner, partner] = walks[0].halves;
    const total = (i: 0 | 1) => walks.reduce((sum, w) => sum + w.halves[i].price, 0);
    const summary = {
        dry_run: dryRun,
        series_id: data.series_id,
        partner_series_id: dryRun ? null : partnerSeriesId,
        duration_minutes: duration,
        first: { owner_name: firstOwner.ownerName, dog_name: firstOwner.dogName, total: total(0) },
        partner: {
            owner_name: partner.ownerName,
            dog_name: partner.dogName,
            total: total(1),
            new_bookings: createdForPartner,
            converted_bookings: walks.length - createdForPartner,
        },
        walks: walks.map((w) => ({
            start_time: w.start.toISOString(),
            price_first: w.halves[0].price,
            old_price_first: w.halves[0].oldPrice,
            price_partner: w.halves[1].price,
            partner_converted: w.halves[1].converted,
        })),
        warnings,
    };

    if (dryRun) {
        return NextResponse.json({ success: true, ...summary });
    }

    // --- Everything below is best effort: the bookings already exist. ---

    const seriesTotals: Record<number, number> = { [data.series_id]: sourceSeriesTotal };
    if (partnerSeriesId) seriesTotals[partnerSeriesId] = createdForPartner;
    for (const w of walks) {
        warnings.push(
            ...(await syncSharedWalkCalendar(w.halves, w.start, w.end, duration, {
                status: "confirmed",
                isHistorical: false,
                seriesTotals,
            }))
        );
    }

    const dateLine = (d: Date) => format(new TZDate(d, TIMEZONE), "EEE d MMM 'at' HH:mm");

    try {
        await sendTelegramNotification(
            [
                `🐕🐕 SERIES #${data.series_id} IS NOW SHARED`,
                "",
                `🐾 ${firstOwner.dogName} — ${firstOwner.ownerName} — ${walks.length} walks, £${total(0).toFixed(2)}`,
                `🐾 ${partner.dogName} — ${partner.ownerName} — ${walks.length} walks, £${total(1).toFixed(2)}${partnerSeriesId ? ` (new series #${partnerSeriesId})` : ""}`,
                `📅 ${dateLine(walks[0].start)} → ${dateLine(walks[walks.length - 1].start)} (${duration}min)`,
                ...warnings.map((w) => `⚠️ ${w}`),
            ].join("\n")
        );
    } catch (telegramError) {
        console.error("Shared series: Telegram notification failed:", telegramError);
    }

    // One email per household listing every walk, not one per walk.
    if (data.send_email) {
        for (const i of [0, 1] as const) {
            const me = walks[0].halves[i];
            const other = walks[0].halves[1 - i];
            const rows = walks
                .map((w) => {
                    const h = w.halves[i];
                    const was = h.converted && h.oldPrice !== null && h.oldPrice !== h.price
                        ? ` (was £${h.oldPrice.toFixed(2)})`
                        : "";
                    return `<li>${format(new TZDate(w.start, TIMEZONE), "EEEE, d MMMM 'at' HH:mm")} — £${h.price.toFixed(2)}${was}</li>`;
                })
                .join("");
            const html = `
                <h1>Shared Walks Confirmed</h1>
                <p>Hi ${me.ownerName},</p>
                <p>As we discussed, <strong>${me.dogName}</strong> will be walking with <strong>${other.dogName}</strong> on the following ${walks.length} walks (${formatDurationForEmail(duration)} each):</p>
                <ul>${rows}</ul>
                <p><strong>Total:</strong> £${total(i).toFixed(2)}</p>
                <p>A shared walk is two dogs from two homes walking together. If either of you needs to change a time, just message me and I'll arrange it with both households. You can cancel any single walk from your dashboard at any time, with no fee.</p>
                <a href="https://hunters-hounds.london/my-account" style="display: inline-block; padding: 10px 20px; font-weight: bold; color: white; background-color: #3b82f6; border-radius: 4px; text-decoration: none;">
                    View Dashboard
                </a>
                <p>Thank you!</p>
            `;
            try {
                await sendBookingEmail(me.bookingId, `Hunter's Hounds: ${walks.length} Shared Walks with ${other.dogName}`, html);
            } catch (emailError) {
                console.error(`Shared series: email failed for ${me.ownerName}:`, emailError);
                warnings.push(`The confirmation email to ${me.ownerName} was not sent.`);
            }
        }
    }

    return NextResponse.json({ success: true, ...summary, warnings });
}
