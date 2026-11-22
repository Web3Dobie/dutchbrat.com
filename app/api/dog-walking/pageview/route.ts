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

// Scanners that drive a real browser and announce nothing. They give themselves
// away in two ways: a known address block, or a desktop Chrome years out of
// date (desktop Chrome updates itself, so people are almost never that far
// behind; phones can be, so they are not judged on version).
const SCANNER_IP_PREFIXES = ['205.169.39.'];
const MIN_DESKTOP_CHROME = 120; // released December 2023

function looksLikeScanner(ip: string, ua: string): boolean {
    if (SCANNER_IP_PREFIXES.some(p => ip.startsWith(p))) return true;
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) return false;
    const chrome = ua.match(/Chrome\/(\d+)\./);
    return !!chrome && Number(chrome[1]) < MIN_DESKTOP_CHROME;
}

// What identifies a connection for counting. Phones on home broadband change
// the second half of their IPv6 address every few hours, which made one person
// look like several; the first half (the /64) is the household, so use that.
function networkKey(ip: string): string {
    if (!ip.includes(':')) return ip;
    const [head, tail = ''] = ip.toLowerCase().split('::');
    const h = head ? head.split(':') : [];
    const t = tail ? tail.split(':') : [];
    const full = ip.includes('::')
        ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
        : h;
    return full.slice(0, 4).map(x => x.replace(/^0+(?=.)/, '')).join(':');
}

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
        // A logged-in client is a person whatever their browser looks like.
        if (!ownerId && !isAdmin && looksLikeScanner(ip, ua)) return done();

        const visitorHash = crypto
            .createHmac('sha256', secret)
            .update(`pageview|${londonDate()}|${networkKey(ip)}|${ua}`)
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
