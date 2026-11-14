import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import {
    CUSTOMER_COOKIE,
    SESSION_COOKIE_OPTIONS,
    SESSION_TTL_SECONDS,
    signSession,
} from '@/lib/session';
import { getOwnerIdFromSession } from '@/lib/customerAuth';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = CUSTOMER_COOKIE;

// Database Connection
const pool = getPool();

// 20 attempts per 15 minutes per IP, so the email/phone credential cannot be
// guessed in bulk through this endpoint.
const MAX_ATTEMPTS = 20;
const WINDOW_SECONDS = 15 * 60;

// POST: Establish a customer session from a credential the server verifies itself.
//
// This used to accept `owner_id` from the request body and mint a session for it,
// with no check of any kind — so anyone could POST {owner_id: 7} and become that
// customer. The client no longer has any say in who the session is for: it sends
// only the email or phone the person typed, and the owner_id comes from the
// database row that matches.
//
// This is still "knowing a client's email or phone" as proof of identity, which is
// what the login form has always required. It closes the forgery and enumeration
// holes, but it is not yet real identity proof — see the emailed-code step in the
// audit's weekend plan.
export async function POST(request: NextRequest) {
    try {
        const ip = clientIp(request);
        const limit = rateLimit(`customer-session:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS);
        if (!limit.allowed) {
            console.warn(`[Customer Session] Rate limit hit from ${ip}`);
            return tooManyRequests(limit.retryAfter);
        }

        const body = await request.json();
        const email: string | undefined = typeof body?.email === 'string' ? body.email.trim() : undefined;
        const phone: string | undefined = typeof body?.phone === 'string' ? body.phone.trim() : undefined;

        if (!email && !phone) {
            return NextResponse.json(
                { error: 'email or phone is required' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // Matches the same primary-or-partner logic as customer-lookup.
            const result = email
                ? await client.query(
                      `SELECT id, owner_name FROM hunters_hounds.owners
                       WHERE LOWER(email) = LOWER($1) OR LOWER(partner_email) = LOWER($1)
                       LIMIT 1`,
                      [email]
                  )
                : await client.query(
                      `SELECT id, owner_name FROM hunters_hounds.owners
                       WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
                          OR REPLACE(REPLACE(REPLACE(REPLACE(partner_phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
                       LIMIT 1`,
                      [phone!.replace(/[\s\-()]/g, '')]
                  );

            if (result.rows.length === 0) {
                // Generic failure: do not reveal whether the identifier exists.
                console.warn(`[Customer Session] No match for supplied credential from ${ip}`);
                return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
            }

            const owner = result.rows[0];
            const token = signSession(
                { realm: 'customer', owner_id: owner.id },
                SESSION_TTL_SECONDS
            );

            const response = NextResponse.json({ success: true });
            response.cookies.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

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
            const query = `
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
                GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.partner_name, o.partner_email, o.partner_phone, o.payment_preference;
            `;

            const result = await client.query(query, [owner_id]);

            if (result.rows.length === 0) {
                // Customer no longer exists - clear cookie
                console.log(`[Customer Session] Customer ID ${owner_id} not found in database`);
                const response = NextResponse.json({ authenticated: false });
                response.cookies.delete(COOKIE_NAME);
                return response;
            }

            const customer = result.rows[0];
            console.log(`[Customer Session] Retrieved session for: ${customer.owner_name}`);

            return NextResponse.json({
                authenticated: true,
                customer: {
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
                    dogs: customer.dogs || []
                }
            });

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
