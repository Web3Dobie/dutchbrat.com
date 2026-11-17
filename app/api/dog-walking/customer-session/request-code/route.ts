import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/database';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/emailService';
import { generateLoginCodeEmail } from '@/lib/emailTemplates';
import { sendTelegramNotification } from '@/lib/telegram';
import {
    CODE_TTL_SECONDS,
    addressIsThrottled,
    issueLoginCode,
    pruneOldCodes,
} from '@/lib/loginCodes';

export const dynamic = 'force-dynamic';

const pool = getPool();

// 10 requests per 15 minutes per IP. The per-address limit in lib/loginCodes.ts
// is the one that stops a single client being mail-bombed; this one stops an
// attacker cycling through addresses from one machine.
const MAX_REQUESTS = 10;
const WINDOW_SECONDS = 15 * 60;

/**
 * Step one of the customer login: email an address on file a one-time code.
 *
 * The response is identical whether or not the address belongs to a client.
 * That is the whole point — a reply that distinguished the two would turn this
 * endpoint into a way to ask "is this person one of Ernesto's clients?", which
 * is exactly the question the login is meant to stop strangers answering.
 *
 * Email only, no phone. There is no SMS here, so a code for someone who typed a
 * phone number would have to go to the email on file — and telling them which
 * address it went to would leak it, while not telling them leaves them staring
 * at a form with no idea where to look. Every client has an email on record, so
 * asking for it is no barrier.
 */
export async function POST(request: NextRequest) {
    const ip = clientIp(request);
    const limit = rateLimit(`login-code:${ip}`, MAX_REQUESTS, WINDOW_SECONDS);
    if (!limit.allowed) {
        console.warn(`[Login Code] Rate limit hit from ${ip}`);
        return tooManyRequests(limit.retryAfter);
    }

    // The same body for every outcome below, built once so no branch can
    // accidentally differ from another.
    const genericResponse = () =>
        NextResponse.json({
            sent: true,
            message: "If that address is on file, a code is on its way. It's valid for 10 minutes.",
        });

    let email: string;
    try {
        const body = await request.json();
        email = typeof body?.email === 'string' ? body.email.trim() : '';
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // A missing or obviously malformed address is a client-side mistake, not a
    // failed login, so this one can be reported honestly.
    if (!email || !email.includes('@')) {
        return NextResponse.json(
            { error: 'Please enter the email address you booked with.' },
            { status: 400 }
        );
    }

    const client = await pool.connect();
    try {
        // Matches customer-session's own primary-or-partner logic.
        const result = await client.query(
            `SELECT id, owner_name, email, partner_email
               FROM hunters_hounds.owners
              WHERE LOWER(email) = LOWER($1) OR LOWER(partner_email) = LOWER($1)
              LIMIT 1`,
            [email]
        );

        if (result.rows.length === 0) {
            console.warn(`[Login Code] No account for the address supplied from ${ip}`);
            return genericResponse();
        }

        const owner = result.rows[0];

        if (await addressIsThrottled(client, email)) {
            console.warn(`[Login Code] Address throttled (owner ${owner.id}) from ${ip}`);
            return genericResponse();
        }

        const code = await issueLoginCode(client, owner.id, email, ip);

        const { subject, html } = generateLoginCodeEmail({
            ownerName: owner.owner_name,
            code,
            validFor: `${Math.round(CODE_TTL_SECONDS / 60)} minutes`,
        });

        try {
            // skipBusinessBcc: a copy of this would put a live credential for
            // every client into the bookings inbox.
            await sendEmail({ to: email, subject, html, skipBusinessBcc: true });
            console.log(`[Login Code] Code sent for owner ${owner.id}`);
        } catch (sendError) {
            // Still a generic response: a 500 here would only happen for an
            // address that exists, which would give the game away. Tell Ernesto
            // instead, because from the client's side this looks like an email
            // that never arrives.
            console.error('[Login Code] Failed to send code email:', sendError);
            try {
                await sendTelegramNotification(
                    `⚠️ <b>Login code email failed</b>\n\n` +
                        `Could not email a login code to ${owner.owner_name} (owner ${owner.id}).\n` +
                        `They are most likely sitting on the login page waiting for it.`
                );
            } catch (telegramError) {
                console.error('[Login Code] Telegram notification failed:', telegramError);
            }
        }

        // Opportunistic housekeeping; there is no cron on this box.
        await pruneOldCodes(client);

        return genericResponse();
    } catch (error) {
        console.error('[Login Code] Error issuing code:', error);
        return NextResponse.json(
            { error: 'Something went wrong sending your code. Please try again.' },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
