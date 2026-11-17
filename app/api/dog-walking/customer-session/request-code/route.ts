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
    looksLikeEmail,
    maskEmail,
    pruneOldCodes,
    resolveLoginTarget,
} from '@/lib/loginCodes';

export const dynamic = 'force-dynamic';

const pool = getPool();

// 10 requests per 15 minutes per IP. The per-address limit in lib/loginCodes.ts
// is the one that stops a single client being mail-bombed; this one stops an
// attacker cycling through addresses from one machine.
const MAX_REQUESTS = 10;
const WINDOW_SECONDS = 15 * 60;

/**
 * Step one of the customer login: mail a one-time code to the address on file.
 *
 * Takes an email address OR a phone number. Phone numbers are how a fair number
 * of clients have always signed in, and there is no SMS here, so the code goes
 * to the email on record either way — the number identifies the account, it
 * receives nothing.
 *
 * Two different disclosure rules, because the two cases are not alike:
 *
 *   * EMAIL: the response is identical whether or not the address is on file.
 *     Anything else would turn this endpoint into a way for a stranger to ask
 *     "is this person one of Ernesto's clients?", which is the question the
 *     whole login exists to stop them answering. They typed the address, so
 *     there is nothing to tell them anyway.
 *
 *   * PHONE: the response includes the masked destination ("ma•••@gmail.com"),
 *     because a client who signs in by number has no way of knowing which
 *     mailbox to open — and "check your email" is useless to someone who
 *     cannot remember which address they signed up with. The cost is real and
 *     accepted: an unknown number produces no hint, so a hint confirms the
 *     number is on file. What leaks is a masked address, which helps nobody log
 *     in; they would still need the mailbox.
 */
export async function POST(request: NextRequest) {
    const ip = clientIp(request);
    const limit = rateLimit(`login-code:${ip}`, MAX_REQUESTS, WINDOW_SECONDS);
    if (!limit.allowed) {
        console.warn(`[Login Code] Rate limit hit from ${ip}`);
        return tooManyRequests(limit.retryAfter);
    }

    let identifier: string;
    try {
        const body = await request.json();
        // `email` is still accepted so an old cached page keeps working.
        const raw = body?.identifier ?? body?.email ?? body?.phone;
        identifier = typeof raw === 'string' ? raw.trim() : '';
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!identifier) {
        return NextResponse.json(
            { error: 'Please enter your email address or phone number.' },
            { status: 400 }
        );
    }

    const viaEmail = looksLikeEmail(identifier);

    // The response when there is nothing to report. For an email that is every
    // outcome, found or not; for a phone number it is the not-found case, which
    // deliberately carries no hint.
    const genericResponse = () =>
        NextResponse.json({
            sent: true,
            message: viaEmail
                ? "If that address is on file, a code is on its way. It's valid for 10 minutes."
                : "If that number is on file, a code is on its way to the email address we have for you. It's valid for 10 minutes.",
        });

    const client = await pool.connect();
    try {
        const target = await resolveLoginTarget(client, identifier);

        if (!target) {
            console.warn(`[Login Code] No account for the ${viaEmail ? 'address' : 'number'} supplied from ${ip}`);
            return genericResponse();
        }

        if (await addressIsThrottled(client, target.destination)) {
            console.warn(`[Login Code] Address throttled (owner ${target.ownerId}) from ${ip}`);
            return genericResponse();
        }

        const code = await issueLoginCode(client, target.ownerId, target.destination, ip);

        const { subject, html } = generateLoginCodeEmail({
            ownerName: target.ownerName,
            code,
            validFor: `${Math.round(CODE_TTL_SECONDS / 60)} minutes`,
        });

        try {
            // skipBusinessBcc: a copy of this would put a live credential for
            // every client into the bookings inbox.
            await sendEmail({ to: target.destination, subject, html, skipBusinessBcc: true });
            console.log(`[Login Code] Code sent for owner ${target.ownerId} (via ${target.via})`);
        } catch (sendError) {
            // Still a generic response: a 500 here would only happen for an
            // address that exists, which would give the game away. Tell Ernesto
            // instead, because from the client's side this looks like an email
            // that never arrives.
            console.error('[Login Code] Failed to send code email:', sendError);
            try {
                await sendTelegramNotification(
                    `⚠️ <b>Login code email failed</b>\n\n` +
                        `Could not email a login code to ${target.ownerName} (owner ${target.ownerId}).\n` +
                        `They are most likely sitting on the login page waiting for it.`
                );
            } catch (telegramError) {
                console.error('[Login Code] Telegram notification failed:', telegramError);
            }
        }

        // Opportunistic housekeeping; there is no cron on this box.
        await pruneOldCodes(client);

        if (viaEmail) return genericResponse();

        // Phone sign-in: say which mailbox to open, masked.
        return NextResponse.json({
            sent: true,
            sentTo: maskEmail(target.destination),
            message: `A code is on its way to ${maskEmail(target.destination)}. It's valid for 10 minutes.`,
        });
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
