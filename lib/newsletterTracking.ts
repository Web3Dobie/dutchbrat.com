// lib/newsletterTracking.ts
//
// Open and click tracking for newsletter emails.
//
// Each recipient's copy carries a token naming the newsletter and the owner,
// signed with the server secret. Two things follow from the signature:
//   * nobody can invent events for other people by editing a link, and
//   * the click endpoint is not an open redirect — it only forwards to a URL
//     whose signature it issued itself.
//
// Rotating SESSION_SECRET makes links in already-sent emails stop counting;
// they still land on the site's home page rather than failing.

import crypto from 'crypto';

const SITE = 'https://hunters-hounds.london';
const OPEN_PATH = '/api/dog-walking/newsletter/open';
const CLICK_PATH = '/api/dog-walking/newsletter/click';

export interface TrackingIdentity {
    newsletterId: number;
    /** 0 = a test send: links work, nothing is recorded. */
    ownerId: number;
    isPartner: boolean;
}

function mac(data: string): string | null {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) return null;
    return crypto.createHmac('sha256', secret).update(`nltrack|${data}`).digest('base64url').slice(0, 22);
}

function safeEqual(a: string, b: string): boolean {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function makeToken(id: TrackingIdentity): string | null {
    const body = `${id.newsletterId}.${id.ownerId}.${id.isPartner ? 'p' : 'o'}`;
    const sig = mac(body);
    return sig ? `${body}.${sig}` : null;
}

export function parseToken(token: string | null): TrackingIdentity | null {
    if (!token || token.length > 80) return null;
    const m = /^(\d{1,9})\.(\d{1,9})\.([op])\.([A-Za-z0-9_-]{22})$/.exec(token);
    if (!m) return null;
    const expected = mac(`${m[1]}.${m[2]}.${m[3]}`);
    if (!expected || !safeEqual(expected, m[4])) return null;
    return { newsletterId: Number(m[1]), ownerId: Number(m[2]), isPartner: m[3] === 'p' };
}

function signUrl(token: string, url: string): string | null {
    return mac(`${token}|${url}`);
}

/** True only for a destination this server put in that recipient's email. */
export function verifyUrl(token: string, url: string, sig: string | null): boolean {
    const expected = signUrl(token, url);
    return !!expected && !!sig && safeEqual(expected, sig);
}

const decodeAttr = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/**
 * Rewrite a finished newsletter's links to pass through the click endpoint and
 * add the open pixel. Returns the HTML unchanged if no secret is configured.
 *
 * Left alone on purpose:
 *   * the unsubscribe link — it must work even if tracking breaks;
 *   * mailto:, tel: and in-page links;
 *   * links whose visible text is itself a web address: mail apps flag
 *     "text says one URL, link goes to another" as phishing.
 */
export function addTracking(html: string, id: TrackingIdentity): string {
    const token = makeToken(id);
    if (!token) return html;

    const rewritten = html.replace(
        /<a\b([^>]*?)href="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
        (whole, before, href, after, inner) => {
            if (href.includes('/newsletter/unsubscribe') || href.includes('{{')) return whole;
            const text = String(inner).replace(/<[^>]+>/g, '').trim();
            if (/^(https?:\/\/|www\.)/i.test(text)) return whole;
            const url = decodeAttr(href);
            const sig = signUrl(token, url);
            if (!sig) return whole;
            const tracked = `${SITE}${CLICK_PATH}?t=${token}&amp;s=${sig}&amp;u=${encodeURIComponent(url)}`;
            return `<a${before}href="${tracked}"${after}>${inner}</a>`;
        }
    );

    const pixel = `<img src="${SITE}${OPEN_PATH}?t=${token}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;">`;
    return rewritten.includes('</body>') ? rewritten.replace('</body>', `${pixel}</body>`) : rewritten + pixel;
}
