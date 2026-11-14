// frontend/lib/customerAuth.ts
//
// Customer session guards.
//
// The rule this file exists to enforce: **owner_id must come from the verified
// session, never from a query parameter or request body.** Before 2026-10-31
// routes took `?owner_id=N` from the client and returned that owner's data, so
// walking 1..N dumped every client's name, phone, email, address and booking
// history with no credentials at all.
//
// The session cookie is now an HMAC-signed token (lib/session.ts), so its
// owner_id is proof rather than a claim.

import { NextRequest, NextResponse } from 'next/server';
import { CUSTOMER_COOKIE, verifySession } from './session';

/**
 * The authenticated owner_id, or null if there is no valid customer session.
 */
export function getOwnerIdFromSession(request: NextRequest): number | null {
    const payload = verifySession(request.cookies.get(CUSTOMER_COOKIE)?.value, 'customer');
    if (!payload || typeof payload.owner_id !== 'number') return null;
    return payload.owner_id;
}

/** 401 for a request with no valid customer session. */
export function notAuthenticatedResponse(): NextResponse {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}

/**
 * Convenience for the common shape: either an owner_id, or the 401 to return.
 *
 *   const auth = requireOwner(request);
 *   if ('response' in auth) return auth.response;
 *   // auth.ownerId is now trustworthy
 */
export function requireOwner(
    request: NextRequest
): { ownerId: number } | { response: NextResponse } {
    const ownerId = getOwnerIdFromSession(request);
    if (ownerId === null) return { response: notAuthenticatedResponse() };
    return { ownerId };
}

/**
 * Confirm the session owner actually owns `bookingId`.
 *
 * Needed because several routes accepted a bare booking id and acted on it —
 * notably /cancel, where guessing integers let anyone cancel any of 1,120
 * bookings. Returns false if the booking does not exist, which callers should
 * treat the same as "not yours" so the response can't be used to probe which
 * ids are real.
 */
export async function ownsBooking(
    client: { query: (q: string, params: unknown[]) => Promise<{ rows: unknown[] }> },
    ownerId: number,
    bookingId: number
): Promise<boolean> {
    const result = await client.query(
        'SELECT 1 FROM hunters_hounds.bookings WHERE id = $1 AND owner_id = $2',
        [bookingId, ownerId]
    );
    return result.rows.length > 0;
}
