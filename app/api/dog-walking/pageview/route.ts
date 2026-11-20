// POST /api/dog-walking/pageview — records one page view for the admin Traffic page.
//
// Called by app/components/PageViewTracker.tsx from the visitor's browser.
// Public by design (visitors are not logged in), so everything in the body is
// untrusted: it is length-capped, rate-limited, and never echoed back. The
// route always answers 204 so it tells a prober nothing.
//
// See sql/create_page_views.sql for what is stored and why no IP is kept.

import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { getPool } from '@/lib/database';
import { isAuthenticated } from '@/lib/auth';
import { getOwnerIdFromSession } from '@/lib/customerAuth';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Ernesto's own client record. His browsing is flagged, not counted.
const OWNER_SELF_ID = 1;

// Crawlers that do run JavaScript (Googlebot renders pages) still announce
// themselves; drop them here so the table holds people only.
const BOT_UA = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|uptime|python|curl|wget|scrapy|phantom|puppeteer|playwright|facebookexternalhit|gptbot|claude|perplexity|bytespider/i;

const done = () => new NextResponse(null, { status: 204 });

function londonDate(): string {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
}

function clean(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    const v = value.trim().slice(0, max);
    return v || null;
}

export async function POST(request: NextRequest) {
    try {
        const host = request.headers.get('host') || '';
        // The same image serves other sites; only Hunter's Hounds is tracked.
        if (!host.includes('hunters-hounds')) return done();

        const ua = request.headers.get('user-agent') || '';
        if (!ua || BOT_UA.test(ua)) return done();

        const secret = process.env.SESSION_SECRET;
        if (!secret) return done();

        const ip = clientIp(request);
        if (!rateLimit(`pageview:${ip}`, 120, 60).allowed) return done();

        const body = await request.json().catch(() => null);
        const rawPath = clean(body?.path, 200);
        if (!rawPath || !rawPath.startsWith('/')) return done();
        const path = rawPath.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
        // The admin console is not "traffic".
        if (path.startsWith('/dog-walking/admin')) return done();

        let referrerHost: string | null = null;
        const ref = clean(body?.ref, 500);
        if (ref) {
            try {
                const h = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
                if (h && !h.includes('hunters-hounds')) referrerHost = h.slice(0, 100);
            } catch {
                // not a URL — ignore
            }
        }

        const ownerId = getOwnerIdFromSession(request);
        const isAdmin = isAuthenticated(request) || ownerId === OWNER_SELF_ID;

        const visitorHash = crypto
            .createHmac('sha256', secret)
            .update(`pageview|${londonDate()}|${ip}|${ua}`)
            .digest('hex')
            .slice(0, 20);

        const country = clean(request.headers.get('cf-ipcountry'), 2);
        const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';

        await getPool().query(
            `INSERT INTO hunters_hounds.page_views
                (path, visitor_hash, owner_id, is_admin, referrer_host, utm_source, country, device)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [path, visitorHash, ownerId, isAdmin, referrerHost, clean(body?.utm, 50), country, device]
        );
    } catch (err) {
        // Never let analytics break a page; a missing table (e.g. on a box
        // where the migration has not run) lands here too.
        console.error('[pageview] not recorded:', (err as Error).message);
    }
    return done();
}
