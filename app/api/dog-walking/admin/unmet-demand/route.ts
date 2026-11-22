// GET /api/dog-walking/admin/unmet-demand — clients who looked at dates on the
// booking calendar in the last 24 hours and have no booking on them.
//
// Reads hunters_hounds.availability_checks (sql/create_availability_checks.sql).
// A date drops off the list as soon as the client has a live booking on it,
// whoever made it, so fitting someone in by hand clears their entry.

import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TZ = 'Europe/London';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { rows } = await getPool().query(
            `WITH recent AS (
                 SELECT owner_id, wanted_date, service_type,
                        count(*)::int AS times,
                        max(checked_at) AS last_checked,
                        -- what they were offered the last time they looked
                        (array_agg(slots ORDER BY checked_at DESC))[1] AS slots
                 FROM hunters_hounds.availability_checks
                 WHERE checked_at >= now() - interval '24 hours'
                   -- The calendar opens on today's date by itself, so a look at
                   -- "today" is the page loading, not the client choosing.
                   AND wanted_date > (checked_at AT TIME ZONE '${TZ}')::date
                 GROUP BY owner_id, wanted_date, service_type
             )
             SELECT r.owner_id, o.owner_name,
                    to_char(r.wanted_date, 'YYYY-MM-DD') AS wanted_date,
                    r.service_type, r.times, r.slots, r.last_checked
             FROM recent r
             JOIN hunters_hounds.owners o ON o.id = r.owner_id
             WHERE NOT EXISTS (
                 SELECT 1 FROM hunters_hounds.bookings b
                 WHERE b.owner_id = r.owner_id
                   AND b.status <> 'cancelled'
                   AND (b.start_time AT TIME ZONE '${TZ}')::date = r.wanted_date
             )
             ORDER BY r.last_checked DESC, r.wanted_date`
        );

        // One entry per client, newest activity first.
        const byOwner = new Map<number, {
            owner_id: number; owner_name: string; last_checked: string;
            full: { date: string; times: number; service: string | null }[];
            open: { date: string; times: number; service: string | null }[];
        }>();
        for (const r of rows) {
            let entry = byOwner.get(r.owner_id);
            if (!entry) {
                entry = { owner_id: r.owner_id, owner_name: r.owner_name, last_checked: r.last_checked, full: [], open: [] };
                byOwner.set(r.owner_id, entry);
            }
            (r.slots === 0 ? entry.full : entry.open).push({ date: r.wanted_date, times: r.times, service: r.service_type });
        }
        const clients = Array.from(byOwner.values());
        for (const c of clients) {
            c.full.sort((a, b) => a.date.localeCompare(b.date));
            c.open.sort((a, b) => a.date.localeCompare(b.date));
        }
        // Clients who hit a full date come first: those are the ones to contact.
        clients.sort((a, b) => Number(b.full.length > 0) - Number(a.full.length > 0));

        return NextResponse.json({ clients });
    } catch (err) {
        console.error('[unmet-demand] query failed:', err);
        return NextResponse.json({ error: 'Could not load the list' }, { status: 500 });
    }
}
