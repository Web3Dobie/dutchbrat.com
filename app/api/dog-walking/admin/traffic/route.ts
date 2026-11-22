// GET /api/dog-walking/admin/traffic?days=7|30|90 — figures for the admin Traffic page.
//
// Reads hunters_hounds.page_views (see sql/create_page_views.sql). Days are
// London calendar days. Ernesto's own views (is_admin) are excluded throughout.
//
// "Visitors" counts one person once per day, and the same person on two days
// twice — the price of not keeping a long-lived identifier. A person is the
// client account where there is one (so a client on wifi and then on mobile
// data is one visitor, including views made just before logging in), otherwise
// the daily pseudonym. "Views" counts a page once per person per day, so a tab
// that reloads itself does not keep adding.

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
    const pv = `pv AS (
        SELECT path, owner_id, referrer_host, utm_source, country, device,
               (viewed_at AT TIME ZONE '${TZ}')::date AS day,
               COALESCE('o' || max(owner_id) OVER (PARTITION BY visitor_hash), visitor_hash) AS vkey
        FROM hunters_hounds.page_views
        WHERE NOT is_admin AND viewed_at >= ${since})`;
    const scope = `FROM pv WHERE true`;
    const VISITORS = `count(DISTINCT (day, vkey))::int`;
    const VIEWS = `count(DISTINCT (day, vkey, path))::int`;
    const pool = getPool();

    try {
        const [daily, totals, pages, sources, countries, devices, tracking] = await Promise.all([
            pool.query(
                `WITH ${pv}, d AS (
                     SELECT generate_series(
                         (now() AT TIME ZONE '${TZ}')::date - ($1 - 1),
                         (now() AT TIME ZONE '${TZ}')::date, interval '1 day')::date AS day
                 ), v AS (
                     SELECT day, ${VIEWS} AS views, ${VISITORS} AS visitors
                     ${scope} GROUP BY 1
                 )
                 SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
                        COALESCE(v.views, 0) AS views, COALESCE(v.visitors, 0) AS visitors
                 FROM d LEFT JOIN v USING (day) ORDER BY d.day`,
                [days]
            ),
            pool.query(
                `WITH ${pv} SELECT ${VIEWS} AS views,
                        ${VISITORS} AS visitors,
                        count(DISTINCT owner_id)::int AS clients
                 ${scope}`,
                [days]
            ),
            pool.query(
                `WITH ${pv} SELECT path,
                        ${VIEWS} AS views,
                        ${VISITORS} AS visitors,
                        count(DISTINCT owner_id)::int AS clients
                 ${scope} GROUP BY path ORDER BY visitors DESC, views DESC, path LIMIT 40`,
                [days]
            ),
            pool.query(
                `WITH ${pv} SELECT COALESCE(utm_source, referrer_host) AS source,
                        ${VISITORS} AS visitors
                 ${scope} AND COALESCE(utm_source, referrer_host) IS NOT NULL
                 GROUP BY 1 ORDER BY visitors DESC, source LIMIT 12`,
                [days]
            ),
            pool.query(
                `WITH ${pv} SELECT COALESCE(country, '??') AS country, ${VISITORS} AS visitors
                 ${scope} GROUP BY 1 ORDER BY visitors DESC, country LIMIT 8`,
                [days]
            ),
            pool.query(
                `WITH ${pv} SELECT COALESCE(device, 'unknown') AS device, ${VISITORS} AS visitors
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
