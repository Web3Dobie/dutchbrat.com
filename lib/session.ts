// frontend/lib/session.ts
//
// HMAC-signed session tokens — the cryptographic identity primitive this app
// previously had no equivalent of.
//
// Before 2026-10-31 both cookie schemes were self-asserted strings: the admin
// cookie was the literal 'authenticated', and the customer cookie was base64 of
// {owner_id,...}. Base64 is encoding, not signing, so anyone could mint either
// one by hand and read any client's data. Everything here exists to make a
// cookie's contents provable rather than merely claimed.
//
// Tokens are stateless (no session table): the payload carries its own expiry,
// and rotating SESSION_SECRET invalidates every live session at once, which is
// the intended emergency lever.
//
// Format: v1.<base64url(JSON payload)>.<base64url(HMAC-SHA256 of "v1.<payload>")>

import crypto from 'crypto';

const VERSION = 'v1';

export type SessionRealm = 'admin' | 'customer' | 'hunter' | 'helping-paws';

export interface SessionPayload {
    /** Which login this token is for. A customer token must never satisfy an admin check. */
    realm: SessionRealm;
    /** owners.id — present for realm 'customer' only. The authority for every customer query. */
    owner_id?: number;
    /** helping_paws.participants.id — present for realm 'helping-paws' only. */
    participant_id?: number;
    /** Admin username, for attributing actions in logs. */
    username?: string;
    /** Issued-at and expiry, both epoch seconds. */
    iat: number;
    exp: number;
}

function getSecret(): string | null {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        // Fail CLOSED. A missing or weak secret must reject every session rather
        // than silently accepting unsigned ones — that would reintroduce the bug
        // this module exists to fix.
        console.error(
            '[session] SESSION_SECRET is missing or shorter than 32 chars; all sessions will be rejected.'
        );
        return null;
    }
    return secret;
}

function b64url(input: Buffer | string): string {
    return Buffer.from(input).toString('base64url');
}

function sign(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Create a signed token. Throws if no usable secret is configured — callers are
 * minting a credential, so failing loudly beats issuing something unverifiable.
 */
export function signSession(
    payload: Omit<SessionPayload, 'iat' | 'exp'>,
    ttlSeconds: number
): string {
    const secret = getSecret();
    if (!secret) {
        throw new Error('Cannot create a session: SESSION_SECRET is not configured.');
    }

    const now = Math.floor(Date.now() / 1000);
    const full: SessionPayload = { ...payload, iat: now, exp: now + ttlSeconds };
    const body = `${VERSION}.${b64url(JSON.stringify(full))}`;
    return `${body}.${sign(body, secret)}`;
}

/**
 * Verify a token and return its payload, or null if it is absent, malformed,
 * wrongly signed, expired, or of an unexpected realm. Never throws, so route
 * guards can treat null as "not authenticated" without try/catch.
 */
export function verifySession(
    token: string | undefined | null,
    expectedRealm?: SessionRealm
): SessionPayload | null {
    const secret = getSecret();
    if (!secret || !token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [version, payloadSegment, providedSig] = parts;
    if (version !== VERSION) return null;

    const expectedSig = sign(`${version}.${payloadSegment}`, secret);

    // Compare in constant time. Buffers must match length first, as
    // timingSafeEqual throws on a length mismatch.
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    let payload: SessionPayload;
    try {
        payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf-8'));
    } catch {
        return null;
    }

    // Signature verified, so these fields are trustworthy; validate them anyway
    // so a token minted by an older version of this code can't widen access.
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (expectedRealm && payload.realm !== expectedRealm) return null;

    return payload;
}

/** Cookie names, kept here so route code can't drift from the signing logic. */
export const ADMIN_COOKIE = 'dog-walking-admin-auth';
export const CUSTOMER_COOKIE = 'dog-walking-customer-session';
export const HUNTER_COOKIE = 'hunter-auth';
export const HELPING_PAWS_COOKIE = 'helping-paws-auth';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — admin, hunter, helping-paws

/**
 * Customer sessions last far longer than the staff ones, deliberately.
 *
 * A client logs in by entering a code emailed to the address on file, so the
 * session is backed by proof of mailbox control rather than by knowing an email
 * address. That is what makes a long cookie safe here and not before: a 90-day
 * session granted on a guessable identifier would have been 90 days of access
 * to someone's address, phone and booking history.
 *
 * It also fixes the complaint in lib/customerSession.ts — at 7 days every
 * client was silently logged out roughly weekly, and reported it as a bug. A
 * code four times a year is a fair trade; a code every week is not, and would
 * have made the whole login worse than the one it replaced.
 */
export const CUSTOMER_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

/** Shared cookie attributes. Secure is unconditional: every domain is HTTPS via Cloudflare. */
export const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
};

/** As above, with the customer lifetime. Keep the two in step. */
export const CUSTOMER_COOKIE_OPTIONS = {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: CUSTOMER_TTL_SECONDS,
};
