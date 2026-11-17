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
//   * Verification is scoped to the OWNER, not to the address the code was sent
//     to. It was address-scoped at first, to stop a code mailed to a partner
//     being redeemed by someone typing the primary address — but redeeming it
//     requires the code, and holding the code already means having read that
//     mailbox, so the check guarded nothing. Owner scoping is what lets a
//     client sign in with their phone number: the code goes to the email on
//     file, and they never have to know which address that was.

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
 * Check `code` against the live code for `ownerId`.
 *
 * On success the code is marked used, so it cannot be replayed. On a wrong
 * guess the attempt is counted, and the fifth wrong guess burns the code — the
 * caller should report that as "request a new code" rather than "wrong code",
 * since retrying will no longer help.
 *
 * Deliberately not scoped to the address the code was mailed to: a client who
 * signed in with their phone number has no idea which address that was, and
 * cannot be asked to supply it at step two. See the note at the top of the file
 * for why that costs nothing.
 */
export async function verifyLoginCode(
    client: Queryable,
    ownerId: number,
    code: string
): Promise<VerifyResult> {
    const result = await client.query(
        `SELECT id, code_hash, attempts, expires_at <= NOW() AS is_expired
           FROM hunters_hounds.login_codes
          WHERE owner_id = $1
            AND used_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1`,
        [ownerId]
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

// ---------------------------------------------------------------------------
// Working out who is logging in, and where the code should go
// ---------------------------------------------------------------------------

export interface LoginTarget {
    ownerId: number;
    ownerName: string;
    /** The address the code will actually be sent to. */
    destination: string;
    /** How the customer identified themselves. */
    via: 'email' | 'phone';
}

/** True if the typed identifier looks like an email rather than a phone number. */
export function looksLikeEmail(identifier: string): boolean {
    return identifier.includes('@');
}

/** Phone numbers are stored inconsistently, so compare them stripped. */
function normalisePhone(phone: string): string {
    return phone.replace(/[\s\-()]/g, '');
}

/**
 * Resolve an email address OR phone number to the account it belongs to and the
 * address a code should be mailed to.
 *
 * Phone numbers are supported because they are how a good number of clients
 * have always signed in, and being told "use the email you signed up with"
 * helps nobody who cannot remember which address that was. There is no SMS
 * here, so the code goes to the email on file either way — a phone number
 * identifies the account, it does not receive anything.
 *
 * When the phone matches the PARTNER's number, the code goes to the partner's
 * own address if they have one. Mailing the primary owner instead would be
 * both confusing and a small privacy leak between two people who are not
 * necessarily the same household any more.
 */
export async function resolveLoginTarget(
    client: Queryable,
    identifier: string
): Promise<LoginTarget | null> {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    if (looksLikeEmail(trimmed)) {
        const result = await client.query(
            `SELECT id, owner_name, email, partner_email
               FROM hunters_hounds.owners
              WHERE LOWER(email) = LOWER($1) OR LOWER(partner_email) = LOWER($1)
              LIMIT 1`,
            [trimmed]
        );
        if (result.rows.length === 0) return null;
        const owner = result.rows[0];
        // Mail the address they typed. They know it; echoing it back leaks
        // nothing, and sending elsewhere would be surprising.
        return {
            ownerId: owner.id,
            ownerName: owner.owner_name,
            destination: trimmed,
            via: 'email',
        };
    }

    const digits = normalisePhone(trimmed);
    // Too short to be a real number: treat as no match rather than letting a
    // two-digit string collide with something.
    if (digits.replace(/\D/g, '').length < 7) return null;

    const result = await client.query(
        `SELECT id, owner_name, email, partner_email,
                REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '')         = $1 AS primary_match,
                REPLACE(REPLACE(REPLACE(REPLACE(partner_phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1 AS partner_match
           FROM hunters_hounds.owners
          WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '')         = $1
             OR REPLACE(REPLACE(REPLACE(REPLACE(partner_phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
          LIMIT 1`,
        [digits]
    );
    if (result.rows.length === 0) return null;

    const owner = result.rows[0];
    const destination =
        owner.partner_match && !owner.primary_match && owner.partner_email
            ? owner.partner_email
            : owner.email;

    // A client with a phone number but no email on file cannot be sent a code.
    // Every record has one today; this is here so that stays true by accident
    // rather than by luck.
    if (!destination) return null;

    return {
        ownerId: owner.id,
        ownerName: owner.owner_name,
        destination,
        via: 'phone',
    };
}

/**
 * "marion@clinic.co.uk" -> "ma•••@clinic.co.uk"
 *
 * Shown only to someone who signed in with a phone number, so they know which
 * mailbox to open. The domain is kept whole because that is the part that
 * actually jogs the memory, and is the least sensitive part of an address.
 *
 * This does disclose something: an unknown number produces no hint at all, so
 * the presence of one confirms the number is on file. That is a deliberate
 * trade for not stranding clients who cannot remember which address they used.
 */
export function maskEmail(email: string): string {
    const at = email.lastIndexOf('@');
    if (at <= 0) return '•••';
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const shown = local.slice(0, local.length <= 2 ? 1 : 2);
    return `${shown}${'•'.repeat(Math.max(3, local.length - shown.length))}@${domain}`;
}
