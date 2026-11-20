// GET /api/dog-walking/admin/traffic?days=7|30|90 — figures for the admin Traffic page.
//
// Reads hunters_hounds.page_views (see sql/create_page_views.sql). Days are
// London calendar days. Ernesto's own views (is_admin) are excluded throughout.
//
// "Visitors" is a count of daily pseudonyms: one person on one day counts
// once, and the same person on two days counts twice. That is the price of not
// keeping a long-lived identifier.

import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TZ = 'Europe/London';
const ALLOWED_DAYS = [7, 30, 90];

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    const requested = parseInt(new URL(request.url).searchParams.get('days') || '7', 10);
    const days = ALLOWED_DAYS.includes(requested) ? requested : 7;

    // First London day of the window, as a timestamptz.
    const since = `((date_trunc('day', now() AT TIME ZONE '${TZ}') - make_interval(days => $1 - 1)) AT TIME ZONE '${TZ}')`;
    const scope = `FROM hunters_hounds.page_views WHERE NOT is_admin AND viewed_at >= ${since}`;
    const pool = getPool();

    try {
        const [daily, totals, pages, sources, countries, devices, tracking] = await Promise.all([
            pool.query(
                `WITH d AS (
                     SELECT generate_series(
                         (now() AT TIME ZONE '${TZ}')::date - ($1 - 1),
                         (now() AT TIME ZONE '${TZ}')::date, interval '1 day')::date AS day
                 ), v AS (
                     SELECT (viewed_at AT TIME ZONE '${TZ}')::date AS day,
                            count(*)::int AS views,
                            count(DISTINCT visitor_hash)::int AS visitors
                     ${scope} GROUP BY 1
                 )
                 SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
                        COALESCE(v.views, 0) AS views, COALESCE(v.visitors, 0) AS visitors
                 FROM d LEFT JOIN v USING (day) ORDER BY d.day`,
                [days]
            ),
            pool.query(
                `SELECT count(*)::int AS views,
                        count(DISTINCT visitor_hash)::int AS visitors,
                        count(DISTINCT owner_id)::int AS clients
                 ${scope}`,
                [days]
            ),
            pool.query(
                `SELECT path,
                        count(*)::int AS views,
                        count(DISTINCT visitor_hash)::int AS visitors,
                        count(DISTINCT owner_id)::int AS clients
                 ${scope} GROUP BY path ORDER BY visitors DESC, views DESC, path LIMIT 40`,
                [days]
            ),
            pool.query(
                `SELECT COALESCE(utm_source, referrer_host) AS source,
                        count(DISTINCT visitor_hash)::int AS visitors
                 ${scope} AND COALESCE(utm_source, referrer_host) IS NOT NULL
                 GROUP BY 1 ORDER BY visitors DESC, source LIMIT 12`,
                [days]
            ),
            pool.query(
                `SELECT COALESCE(country, '??') AS country, count(DISTINCT visitor_hash)::int AS visitors
                 ${scope} GROUP BY 1 ORDER BY visitors DESC, country LIMIT 8`,
                [days]
            ),
            pool.query(
                `SELECT COALESCE(device, 'unknown') AS device, count(DISTINCT visitor_hash)::int AS visitors
                 ${scope} GROUP BY 1 ORDER BY visitors DESC`,
                [days]
            ),
            pool.query(`SELECT min(viewed_at) AS since FROM hunters_hounds.page_views`),
        ]);

        return NextResponse.json({
            days,
            trackingSince: tracking.rows[0]?.since ?? null,
            totals: totals.rows[0],
            daily: daily.rows,
            pages: pages.rows,
            sources: sources.rows,
            countries: countries.rows,
            devices: devices.rows,
        });
    } catch (err) {
        console.error('[traffic] query failed:', err);
        return NextResponse.json({ error: 'Could not load traffic figures' }, { status: 500 });
    }
}
