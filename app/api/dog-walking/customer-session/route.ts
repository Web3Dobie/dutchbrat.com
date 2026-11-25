import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import {
    CUSTOMER_COOKIE,
    CUSTOMER_COOKIE_OPTIONS,
    CUSTOMER_TTL_SECONDS,
    signSession,
} from '@/lib/session';
import { getOwnerIdFromSession } from '@/lib/customerAuth';
import { verifySession } from '@/lib/session';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit';
import { resolveLoginTarget, verifyLoginCode } from '@/lib/loginCodes';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = CUSTOMER_COOKIE;

// Database Connection
const pool = getPool();

// 20 attempts per 15 minutes per IP, on top of the five-guesses-per-code limit
// in lib/loginCodes.ts. The per-code limit is what makes a 6-digit code safe;
// this stops someone requesting code after code to get fresh attempts.
const MAX_ATTEMPTS = 20;
const WINDOW_SECONDS = 15 * 60;

/** The customer record the dashboard and booking flows both expect. */
const CUSTOMER_QUERY = `
    SELECT
        o.id as owner_id,
        o.owner_name,
        o.phone,
        o.email,
        o.address,
        o.partner_name,
        o.partner_email,
        o.partner_phone,
        o.payment_preference,
        -- The account form edits these four. They were missing from this
        -- query, so the form opened with photo consent showing "No" and the
        -- vet and insurance boxes empty, and saving wrote that back.
        o.vet_info,
        o.pet_insurance,
        o.photo_sharing_consent,
        o.public_feature_consent,
        -- A meet & greet is a one-off for new clients. A cancelled one
        -- doesn't count, so they can rebook it.
        EXISTS (
            SELECT 1 FROM hunters_hounds.bookings mg
            WHERE mg.owner_id = o.id
              AND mg.service_type = 'meetgreet'
              AND mg.status <> 'cancelled'
        ) AS has_had_meetgreet,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', d.id,
                    'dog_name', d.dog_name,
                    'dog_breed', d.dog_breed,
                    'dog_age', d.dog_age,
                    'dog_birthday', d.dog_birthday,
                    'image_filename', d.image_filename
                )
                ORDER BY d.id
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'::json
        ) as dogs
    FROM hunters_hounds.owners o
    LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id
    WHERE o.id = $1
    GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.partner_name, o.partner_email, o.partner_phone, o.payment_preference,
             o.vet_info, o.pet_insurance, o.photo_sharing_consent, o.public_feature_consent;
`;

interface PgClient {
    query: (q: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
}

/**
 * Shape a customer for the client side.
 *
 * Shared by POST and GET on purpose: POST returns the record directly on a
 * successful login so the UI has no reason to call /customer-lookup, which used
 * to hand out this same data to anyone who knew an email address.
 */
async function fetchCustomer(client: PgClient, ownerId: number) {
    const result = await client.query(CUSTOMER_QUERY, [ownerId]);
    if (result.rows.length === 0) return null;

    const customer = result.rows[0];
    return {
        owner_id: customer.owner_id,
        owner_name: customer.owner_name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        partner_name: customer.partner_name,
        partner_email: customer.partner_email,
        partner_phone: customer.partner_phone,
        payment_preference: customer.payment_preference,
        has_had_meetgreet: customer.has_had_meetgreet,
        dogs: customer.dogs || [],
    };
}

// POST: Establish a customer session from an emailed one-time code.
//
// History, because it explains the shape of this route. It began by accepting
// `owner_id` from the request body and minting a session for it with no check
// of any kind, so anyone could POST {owner_id: 7} and become that customer.
// That was closed on 2026-10-31 by taking only the email or phone and reading
// the owner_id from the matching row — but that still meant *knowing an email
// address* was the entire login, and email addresses are not secret.
//
// Now the address only identifies the account; the code emailed to it is the
// proof. Nothing downstream changed: the token, the cookie and every guarded
// route are as they were, which is why this is the only route that needed
// rewriting.
export async function POST(request: NextRequest) {
    try {
        const ip = clientIp(request);
        const limit = rateLimit(`customer-session:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS);
        if (!limit.allowed) {
            console.warn(`[Customer Session] Rate limit hit from ${ip}`);
            return tooManyRequests(limit.retryAfter);
        }

        const body = await request.json();
        // `email` is still accepted so an old cached page keeps working.
        const rawIdentifier = body?.identifier ?? body?.email ?? body?.phone;
        const identifier: string = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';
        const code: string = typeof body?.code === 'string' ? body.code.trim() : '';

        if (!identifier || !code) {
            return NextResponse.json(
                { error: 'Both your email address or phone number and the code are required.' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // Same resolution as request-code, so whatever identified the
            // account at step one identifies it at step two. The code itself is
            // checked against the OWNER, not against the address it was mailed
            // to — a client who signed in by phone number never learns that
            // address and cannot be asked for it here.
            const target = await resolveLoginTarget(client, identifier);

            // One message for an unknown identifier, a wrong code and an
            // expired code alike. Distinguishing them would say whether the
            // identifier belongs to a client, which is what the code step
            // exists to hide.
            const badCode = () =>
                NextResponse.json(
                    { error: 'That code is not right, or it has expired. Please request a new one.' },
                    { status: 401 }
                );

            if (!target) {
                console.warn(`[Customer Session] Code submitted for an unknown identifier from ${ip}`);
                return badCode();
            }

            const owner = { id: target.ownerId, owner_name: target.ownerName };
            const verification = await verifyLoginCode(client, owner.id, code);

            if (!verification.ok) {
                console.warn(
                    `[Customer Session] Code rejected for owner ${owner.id} (${verification.reason}) from ${ip}`
                );
                if (verification.reason === 'too_many_attempts') {
                    // Worth saying plainly: retrying this code will never work
                    // again, and without being told they will keep trying.
                    return NextResponse.json(
                        { error: 'Too many incorrect attempts. Please request a new code.' },
                        { status: 401 }
                    );
                }
                return badCode();
            }

            const customer = await fetchCustomer(client, owner.id);
            if (!customer) {
                console.error(`[Customer Session] Owner ${owner.id} vanished mid-login`);
                return badCode();
            }

            const token = signSession(
                { realm: 'customer', owner_id: owner.id },
                CUSTOMER_TTL_SECONDS
            );

            const response = NextResponse.json({ success: true, customer });
            response.cookies.set(COOKIE_NAME, token, CUSTOMER_COOKIE_OPTIONS);

            console.log(`[Customer Session] Session issued for: ${owner.owner_name} (ID: ${owner.id})`);
            return response;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[Customer Session] Error setting session:', error);
        return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
    }
}

// GET: Get current customer from session cookie (fetches fresh data from DB)
export async function GET(request: NextRequest) {
    try {
        // Verifies the HMAC signature, realm and expiry. An unsigned or tampered
        // cookie — including every pre-2026-10-31 base64 one — yields null here.
        const owner_id = getOwnerIdFromSession(request);

        if (!owner_id) {
            const response = NextResponse.json({ authenticated: false });
            response.cookies.delete(COOKIE_NAME);
            return response;
        }

        // Fetch fresh customer data from database
        const client = await pool.connect();
        try {
            const customer = await fetchCustomer(client, owner_id);

            if (!customer) {
                // Customer no longer exists - clear cookie
                console.log(`[Customer Session] Customer ID ${owner_id} not found in database`);
                const response = NextResponse.json({ authenticated: false });
                response.cookies.delete(COOKIE_NAME);
                return response;
            }

            console.log(`[Customer Session] Retrieved session for: ${customer.owner_name}`);

            const response = NextResponse.json({ authenticated: true, customer });

            // Sliding expiry: once a session is past its halfway point, reissue
            // it. A client who uses the site every few weeks is then never
            // asked for a code again, while one who disappears for three months
            // still has to prove the mailbox when they come back. Without this,
            // everyone re-authenticates every 90 days regardless — which is
            // tolerable, but there is no reason to make a regular do it.
            const payload = verifySession(request.cookies.get(COOKIE_NAME)?.value, 'customer');
            if (payload) {
                const remaining = payload.exp - Math.floor(Date.now() / 1000);
                if (remaining < CUSTOMER_TTL_SECONDS / 2) {
                    response.cookies.set(
                        COOKIE_NAME,
                        signSession({ realm: 'customer', owner_id: owner_id }, CUSTOMER_TTL_SECONDS),
                        CUSTOMER_COOKIE_OPTIONS
                    );
                    console.log(`[Customer Session] Session extended for owner ${owner_id}`);
                }
            }

            return response;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[Customer Session] Error getting session:', error);
        return NextResponse.json(
            { error: 'Failed to get session' },
            { status: 500 }
        );
    }
}

// DELETE: Clear customer session (logout)
export async function DELETE(request: NextRequest) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(COOKIE_NAME);
    console.log('[Customer Session] Session cleared');
    return response;
}
