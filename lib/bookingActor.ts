import { NextResponse, type NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getOwnerIdFromSession, notAuthenticatedResponse } from '@/lib/customerAuth';

/**
 * Who is acting on a booking, and for which owner.
 *
 * The recurring routes need to serve two callers: a signed-in client acting for
 * themselves from the dashboard, and the admin acting for anybody. Rather than
 * duplicate those routes, they resolve the caller through here.
 *
 * `owner_id` arriving in a request body is a REQUEST, never an assertion. An
 * admin's is honoured; a client's is checked against their session and refused
 * if it is not their own. Before this existed, the recurring book and
 * availability routes had no authentication at all and took `owner_id` from the
 * body on trust, so anyone could write bookings into the diary for any client.
 */
export type Actor =
    | { kind: 'admin'; ownerId: number }
    | { kind: 'owner'; ownerId: number };

export function resolveActor(
    request: NextRequest,
    requestedOwnerId?: number | null
): Actor | { response: NextResponse } {
    // Admin session: may act for any owner, but must say which.
    if (isAuthenticated(request)) {
        if (!requestedOwnerId) {
            return {
                response: NextResponse.json(
                    { error: 'owner_id is required when acting as admin' },
                    { status: 400 }
                ),
            };
        }
        return { kind: 'admin', ownerId: requestedOwnerId };
    }

    // Client session: may act only for themselves.
    const sessionOwnerId = getOwnerIdFromSession(request);
    if (sessionOwnerId === null) {
        return { response: notAuthenticatedResponse() };
    }
    if (requestedOwnerId && requestedOwnerId !== sessionOwnerId) {
        return {
            response: NextResponse.json(
                { error: 'You can only book for your own account' },
                { status: 403 }
            ),
        };
    }
    return { kind: 'owner', ownerId: sessionOwnerId };
}

/**
 * Who is acting on an EXISTING series, looked up by its id.
 *
 * Unlike resolveActor, an admin does not have to name an owner: the series
 * already says whose it is. (resolveActor refused every admin call that came
 * without an owner_id, so the admin could neither view nor cancel a series.)
 * A client is still limited to their own: callers must filter on ownerId
 * whenever kind is 'owner'.
 */
export type SeriesActor = { kind: 'admin' } | { kind: 'owner'; ownerId: number };

export function resolveSeriesActor(
    request: NextRequest
): SeriesActor | { response: NextResponse } {
    if (isAuthenticated(request)) return { kind: 'admin' };
    const sessionOwnerId = getOwnerIdFromSession(request);
    if (sessionOwnerId === null) {
        return { response: notAuthenticatedResponse() };
    }
    return { kind: 'owner', ownerId: sessionOwnerId };
}

/** True when this actor may ignore the client-facing booking horizon. */
export function mayExceedBookingHorizon(actor: Actor): boolean {
    return actor.kind === 'admin';
}
