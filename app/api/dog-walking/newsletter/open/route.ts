// GET /api/dog-walking/newsletter/open?t=TOKEN — the newsletter's open pixel.
// Always answers with the same 1x1 GIF, whatever the token, so it reveals nothing.

import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/database';
import { parseToken } from '@/lib/newsletterTracking';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(request: NextRequest) {
    try {
        const id = parseToken(request.nextUrl.searchParams.get('t'));
        if (id && id.ownerId > 0 && rateLimit(`nl-open:${clientIp(request)}`, 120, 60).allowed) {
            await getPool().query(
                `INSERT INTO hunters_hounds.newsletter_events (newsletter_id, owner_id, is_partner, kind, user_agent)
                 VALUES ($1, $2, $3, 'open', $4)`,
                [id.newsletterId, id.ownerId, id.isPartner, (request.headers.get('user-agent') || '').slice(0, 300)]
            );
        }
    } catch (err) {
        console.error('[newsletter open] not recorded:', (err as Error).message);
    }
    return new NextResponse(GIF, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, private, max-age=0' },
    });
}
