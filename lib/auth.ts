import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
    ADMIN_COOKIE,
    HUNTER_COOKIE,
    verifySession,
    type SessionPayload,
} from './session';

// Admin authentication.
//
// Until 2026-10-31 this module compared the cookie to the literal string
// 'authenticated', so `Cookie: dog-walking-admin-auth=authenticated` granted
// access to all 40 admin routes with no credentials at all. The cookie is now an
// HMAC-signed token (lib/session.ts) that cannot be produced without the server
// secret.
//
// isAuthenticated() deliberately keeps its original name and signature: 36 admin
// routes call it, and they are all fixed by this file alone.

/**
 * Returns the verified admin session, or null. Prefer this over isAuthenticated()
 * when the route wants to attribute an action to a username.
 */
export function getAdminSession(req: NextRequest): SessionPayload | null {
    return verifySession(req.cookies.get(ADMIN_COOKIE)?.value, 'admin');
}

/**
 * Check for a valid, unexpired, correctly signed dog-walking admin session.
 */
export function isAuthenticated(req: NextRequest): boolean {
    return getAdminSession(req) !== null;
}

/**
 * The Hunter media area (/api/hunter/*) is a separate realm sharing the same
 * credentials. Its token is realm-scoped, so a dog-walking admin cookie will not
 * satisfy it and vice versa.
 */
export function isHunterAuthenticated(req: NextRequest): boolean {
    return verifySession(req.cookies.get(HUNTER_COOKIE)?.value, 'hunter') !== null;
}

/**
 * Standard 401 Unauthorized response for unauthenticated requests
 */
export function unauthorizedResponse(): NextResponse {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

/**
 * Constant-time string comparison. Inputs are hashed first so that differing
 * lengths — which timingSafeEqual rejects outright — don't leak the password
 * length through an early return.
 */
function safeEqual(a: string, b: string): boolean {
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
}

/**
 * Verify admin credentials against the environment. Shared by the dog-walking and
 * Hunter login routes, which have always accepted the same credentials.
 *
 * Returns the matched username (for the session payload) or null.
 */
export function verifyAdminCredentials(username: string, password: string): string | null {
    const candidates: Array<{ username?: string; password?: string }> = [
        { username: process.env.HUNTER_ADMIN_USER, password: process.env.HUNTER_ADMIN_PASSWORD },
        { username: process.env.HUNTER_ADMIN_USER_2, password: process.env.HUNTER_ADMIN_PASSWORD_2 },
    ];

    if (!candidates[0].username || !candidates[0].password) {
        console.error(
            'Missing required environment variables: HUNTER_ADMIN_USER and/or HUNTER_ADMIN_PASSWORD'
        );
        return null;
    }

    let matched: string | null = null;
    for (const cred of candidates) {
        if (!cred.username || !cred.password) continue;
        // No short-circuit: every configured credential is compared so the work
        // done does not depend on which one matches.
        if (safeEqual(username, cred.username) && safeEqual(password, cred.password)) {
            matched = cred.username;
        }
    }
    return matched;
}
