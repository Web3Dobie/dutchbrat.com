// frontend/lib/customerSession.ts
//
// Client-side handling of an expired customer session.
//
// Why this exists: a customer session eventually expires (90 days, sliding —
// CUSTOMER_TTL_SECONDS in lib/session.ts; it was 7 days fixed when this file was
// written, which is what made the dead end below a weekly event rather than a
// rare one). Once one expires, every guarded route returns
// 401 {"error":"Not authenticated"} — and each dashboard component used to do
//
//     if (!response.ok) throw new Error(data.error || "...")
//     ...
//     setError(err.message)
//
// which painted the literal string "Not authenticated" on screen with no hint
// that logging in again would fix it. Graham Southern reported it as "an
// authentication error" on 2026-11-13 while adding a second dog to a booking;
// nothing was broken, he was just logged out. No component anywhere handled a
// 401, so every client hit this dead end roughly weekly.
//
// There is deliberately no "use client" directive: nothing here touches a
// client-only API at module scope, and the importing components are already
// client components.

/** Shown to the customer in place of the server's "Not authenticated". */
export const SESSION_EXPIRED_MESSAGE =
    "Your session has expired — please log in again to continue.";

/**
 * Thrown by customerFetch on a 401 so callers' existing
 * `catch (err) { setError(err.message) }` surfaces something actionable
 * without any change to their error handling.
 */
export class SessionExpiredError extends Error {
    constructor(message: string = SESSION_EXPIRED_MESSAGE) {
        super(message);
        this.name = "SessionExpiredError";
    }
}

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Subscribe to session expiry; returns an unsubscribe function.
 *
 * CustomerDashboard uses this to drop back to the login view. Components that
 * are not inside a dashboard shell (the public /book-now flow) need no
 * listener — they still get the friendly message from the thrown error.
 */
export function onSessionExpired(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function notifySessionExpired(): void {
    // Copy first: a listener may unsubscribe itself while being notified.
    for (const listener of Array.from(listeners)) {
        try {
            listener();
        } catch (err) {
            console.error("[customerSession] expiry listener failed:", err);
        }
    }
}

/**
 * fetch(), with exactly one behaviour added: a 401 is treated as an expired
 * session — listeners are notified and a SessionExpiredError is thrown.
 *
 * Identical to fetch() for every other status, so callers keep their own
 * handling of 400s, 404s and 500s untouched.
 *
 * Do NOT use this for the login, registration or session-probe calls
 * (customer-lookup, user-register, customer-session). A failure there means
 * "wrong details" or "not logged in yet", not "your session expired", and
 * routing it through here would show an expiry notice to someone who never had
 * a session — or, on the mount probe, on every first visit.
 */
export async function customerFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const response = await fetch(input, init);

    if (response.status === 401) {
        notifySessionExpired();
        throw new SessionExpiredError();
    }

    return response;
}
