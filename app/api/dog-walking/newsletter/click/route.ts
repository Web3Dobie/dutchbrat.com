// GET /api/dog-walking/newsletter/click?t=TOKEN&s=SIG&u=URL — counts a click
// on a newsletter link, then sends the reader on to it.
//
// Not an open redirect: `u` is followed only if `s` is this server's own
// signature over (token, url). Anything else goes to the home page.

import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/database';
import { parseToken, verifyUrl } from '@/lib/newsletterTracking';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const HOME = 'https://hunters-hounds.london/';

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const token = params.get('t');
    const url = params.get('u');
    const id = parseToken(token);

    if (!id || !token || !url || url.length > 2000 || !/^https?:\/\//i.test(url) || !verifyUrl(token, url, params.get('s'))) {
        return NextResponse.redirect(HOME, 302);
    }

    try {
        if (id.ownerId > 0 && rateLimit(`nl-click:${clientIp(request)}`, 120, 60).allowed) {
            await getPool().query(
                `INSERT INTO hunters_hounds.newsletter_events (newsletter_id, owner_id, is_partner, kind, url, user_agent)
                 VALUES ($1, $2, $3, 'click', $4, $5)`,
                [id.newsletterId, id.ownerId, id.isPartner, url, (request.headers.get('user-agent') || '').slice(0, 300)]
            );
        }
    } catch (err) {
        // The reader still gets where they were going.
        console.error('[newsletter click] not recorded:', (err as Error).message);
    }

    const res = NextResponse.redirect(url, 302);
    res.headers.set('Cache-Control', 'no-store, private');
    return res;
}
