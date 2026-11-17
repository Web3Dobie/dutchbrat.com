// frontend/lib/loginCodes.ts
//
// One-time codes emailed to a client so the login proves they control the
// address on file, rather than merely knowing it.
//
// The problem this solves: before this existed, POSTing an email address to
// /customer-session minted a signed session for whoever matched it, and
// /customer-lookup returned that client's full record unauthenticated. Email
// addresses are not secret — they are on invoices, in reply-all threads, in
// every WhatsApp group — so the login had no secret in it at all.
//
// Design notes, in the order they matter:
//
//   * Codes are stored as an HMAC keyed with SESSION_SECRET, never in the
//     clear. Reading the table does not yield a usable login, and rotating
//     SESSION_SECRET kills outstanding codes along with live sessions.
//   * Six digits is only 10^6, so the attempt limit — not the length — is what
//     makes guessing hopeless. Five wrong guesses burns the code.
//   * Issuing a code expires the previous ones for that owner, so there is at
//     most one live code per client at a time. Without this, requesting three
//     codes would leave three valid.
//   * Verification is scoped to the address the code was SENT to, not just the
//     owner. A partner email logs into the primary owner's account, so an
//     owner-only check would let a code mailed to the partner be redeemed by
//     someone typing the primary address.

import crypto from 'crypto';

/** How long a code stays usable. Long enough for a slow mail server, short enough to matter. */
export const CODE_TTL_SECONDS = 10 * 60;

/** Wrong guesses allowed against a single code before it is burnt. */
export const MAX_ATTEMPTS = 5;

/** Codes per email address per hour, on top of the per-IP limit in the route. */
export const MAX_REQUESTS_PER_ADDRESS = 5;
export const ADDRESS_WINDOW_SECONDS = 60 * 60;

/** Minimal shape of a pg client, so this module needs no pool of its own. */
export interface Queryable {
    query: (q: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
}

function hashCode(code: string): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        // Fail closed, exactly as lib/session.ts does. Hashing with a missing
        // key would make every code verifiable by anyone who knew that.
        throw new Error('Cannot handle login codes: SESSION_SECRET is not configured.');
    }
    return crypto.createHmac('sha256', secret).update(code).digest('base64url');
}

/**
 * A uniformly random 6-digit code, zero-padded.
 *
 * crypto.randomInt rather than Math.random (not random enough to be a
 * credential) and rather than randomBytes % 1000000 (biased).
 */
function generateCode(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** True if this address has asked for too many codes lately. */
export async function addressIsThrottled(client: Queryable, sentTo: string): Promise<boolean> {
    const result = await client.query(
        `SELECT COUNT(*)::int AS recent
           FROM hunters_hounds.login_codes
          WHERE LOWER(sent_to) = LOWER($1)
            AND created_at > NOW() - ($2 || ' seconds')::interval`,
        [sentTo, String(ADDRESS_WINDOW_SECONDS)]
    );
    return (result.rows[0]?.recent ?? 0) >= MAX_REQUESTS_PER_ADDRESS;
}

/**
 * Mint a code for `ownerId`, to be emailed to `sentTo`.
 *
 * Returns the plaintext code, which the caller must email and then forget: it
 * is deliberately not recoverable from the database afterwards.
 */
export async function issueLoginCode(
    client: Queryable,
    ownerId: number,
    sentTo: string,
    requestedIp: string | null
): Promise<string> {
    const code = generateCode();

    // At most one live code per client.
    await client.query(
        `UPDATE hunters_hounds.login_codes
            SET expires_at = NOW()
          WHERE owner_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
        [ownerId]
    );

    await client.query(
        `INSERT INTO hunters_hounds.login_codes
             (owner_id, code_hash, sent_to, expires_at, requested_ip)
         VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval, $5)`,
        [ownerId, hashCode(code), sentTo, String(CODE_TTL_SECONDS), requestedIp]
    );

    return code;
}

export type VerifyResult =
    | { ok: true; ownerId: number }
    | { ok: false; reason: 'no_code' | 'expired' | 'too_many_attempts' | 'wrong_code' };

/**
 * Check `code` against the live code for `ownerId` that was sent to `sentTo`.
 *
 * On success the code is marked used, so it cannot be replayed. On a wrong
 * guess the attempt is counted, and the fifth wrong guess burns the code — the
 * caller should report that as "request a new code" rather than "wrong code",
 * since retrying will no longer help.
 */
export async function verifyLoginCode(
    client: Queryable,
    ownerId: number,
    sentTo: string,
    code: string
): Promise<VerifyResult> {
    const result = await client.query(
        `SELECT id, code_hash, attempts, expires_at <= NOW() AS is_expired
           FROM hunters_hounds.login_codes
          WHERE owner_id = $1
            AND LOWER(sent_to) = LOWER($2)
            AND used_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1`,
        [ownerId, sentTo]
    );

    if (result.rows.length === 0) return { ok: false, reason: 'no_code' };

    const row = result.rows[0];
    if (row.is_expired) return { ok: false, reason: 'expired' };
    if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

    const provided = Buffer.from(hashCode(code.trim()));
    const expected = Buffer.from(row.code_hash);
    const matches =
        provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

    if (!matches) {
        const bumped = await client.query(
            `UPDATE hunters_hounds.login_codes
                SET attempts = attempts + 1
              WHERE id = $1
              RETURNING attempts`,
            [row.id]
        );
        const attempts = bumped.rows[0]?.attempts ?? MAX_ATTEMPTS;
        return { ok: false, reason: attempts >= MAX_ATTEMPTS ? 'too_many_attempts' : 'wrong_code' };
    }

    await client.query(
        `UPDATE hunters_hounds.login_codes SET used_at = NOW() WHERE id = $1`,
        [row.id]
    );

    return { ok: true, ownerId };
}

/**
 * Drop codes that expired over a day ago. Called opportunistically from the
 * request-code route; there is no cron on this box and the table would
 * otherwise grow forever for no purpose.
 */
export async function pruneOldCodes(client: Queryable): Promise<void> {
    try {
        await client.query(
            `DELETE FROM hunters_hounds.login_codes WHERE expires_at < NOW() - INTERVAL '1 day'`
        );
    } catch (error) {
        // Housekeeping must never fail a login.
        console.error('[Login Codes] Prune failed:', error);
    }
}
