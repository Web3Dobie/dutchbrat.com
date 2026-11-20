// GET /api/dog-walking/admin/newsletter/engagement        — one line per sent newsletter
// GET /api/dog-walking/admin/newsletter/engagement?id=N   — plus who opened/clicked and which links
//
// Admin only: this is the one place client names sit next to what they read.
// See sql/create_newsletter_events.sql for how far to trust an "open".

import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    const pool = getPool();
    const idParam = new URL(request.url).searchParams.get('id');

    try {
        const list = await pool.query(
            `SELECT n.id, n.title, n.sent_at, n.recipient_count, n.tracked,
                    count(DISTINCT (e.owner_id, e.is_partner)) FILTER (WHERE e.kind = 'open')::int  AS opened,
                    count(DISTINCT (e.owner_id, e.is_partner)) FILTER (WHERE e.kind = 'click')::int AS clicked,
                    count(*) FILTER (WHERE e.kind = 'click')::int AS clicks
             FROM hunters_hounds.newsletters n
             LEFT JOIN hunters_hounds.newsletter_events e ON e.newsletter_id = n.id
             WHERE n.sent_at IS NOT NULL
             GROUP BY n.id
             ORDER BY n.sent_at DESC`
        );
        const newsletters = list.rows.map((r) => ({ ...r, title: String(r.title || '').trim() }));

        if (!idParam) return NextResponse.json({ newsletters });

        const id = parseInt(idParam, 10);
        if (!Number.isInteger(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

        const [recipients, links] = await Promise.all([
            pool.query(
                `SELECT o.id AS owner_id, o.owner_name, h.email_status,
                        count(*) FILTER (WHERE e.kind = 'open')::int  AS opens,
                        count(*) FILTER (WHERE e.kind = 'click')::int AS clicks,
                        bool_or(e.is_partner) FILTER (WHERE e.kind IS NOT NULL) AS partner_too,
                        min(e.occurred_at) FILTER (WHERE e.kind = 'open')  AS first_open,
                        max(e.occurred_at) AS last_seen
                 FROM hunters_hounds.newsletter_history h
                 JOIN hunters_hounds.owners o ON o.id = h.owner_id
                 LEFT JOIN hunters_hounds.newsletter_events e
                        ON e.newsletter_id = h.newsletter_id AND e.owner_id = h.owner_id
                 WHERE h.newsletter_id = $1
                 GROUP BY o.id, o.owner_name, h.email_status
                 ORDER BY (count(*) FILTER (WHERE e.kind = 'click')) DESC,
                          (count(*) FILTER (WHERE e.kind = 'open')) DESC, o.owner_name`,
                [id]
            ),
            pool.query(
                `SELECT e.url, count(*)::int AS clicks,
                        count(DISTINCT (e.owner_id, e.is_partner))::int AS people,
                        array_agg(DISTINCT o.owner_name ORDER BY o.owner_name) AS who
                 FROM hunters_hounds.newsletter_events e
                 JOIN hunters_hounds.owners o ON o.id = e.owner_id
                 WHERE e.newsletter_id = $1 AND e.kind = 'click'
                 GROUP BY e.url ORDER BY people DESC, clicks DESC, e.url`,
                [id]
            ),
        ]);

        return NextResponse.json({ newsletters, id, recipients: recipients.rows, links: links.rows });
    } catch (err) {
        console.error('[newsletter engagement] query failed:', err);
        return NextResponse.json({ error: 'Could not load newsletter figures' }, { status: 500 });
    }
}
