import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'dog-walking-customer-session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'agents_platform',
    user: process.env.POSTGRES_USER || 'hunter_admin',
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

// POST: Set customer session cookie after successful lookup
export async function POST(request: NextRequest) {
    try {
        const { owner_id, owner_name, email, phone } = await request.json();

        if (!owner_id || !email) {
            return NextResponse.json(
                { error: 'owner_id and email are required' },
                { status: 400 }
            );
        }

        // Encode session data as base64
        const sessionData = Buffer.from(JSON.stringify({
            owner_id,
            owner_name,
            email,
            phone
        })).toString('base64');

        const response = NextResponse.json({ success: true });
        response.cookies.set(COOKIE_NAME, sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE,
            path: '/'
        });

        console.log(`[Customer Session] Set session for: ${owner_name} (ID: ${owner_id})`);
        return response;

    } catch (error) {
        console.error('[Customer Session] Error setting session:', error);
        return NextResponse.json(
            { error: 'Failed to set session' },
            { status: 500 }
        );
    }
}

// GET: Get current customer from session cookie (fetches fresh data from DB)
export async function GET(request: NextRequest) {
    try {
        const sessionCookie = request.cookies.get(COOKIE_NAME);

        if (!sessionCookie?.value) {
            return NextResponse.json({ authenticated: false });
        }

        // Decode session data
        let sessionData;
        try {
            sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
        } catch {
            // Invalid cookie data - clear it
            const response = NextResponse.json({ authenticated: false });
            response.cookies.delete(COOKIE_NAME);
            return response;
        }

        const { owner_id } = sessionData;

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
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', d.id,
                                'dog_name', d.dog_name,
                                'dog_breed', d.dog_breed,
                                'dog_age', d.dog_age,
                                'image_filename', d.image_filename
                            )
                            ORDER BY d.id
                        ) FILTER (WHERE d.id IS NOT NULL),
                        '[]'::json
                    ) as dogs
                FROM hunters_hounds.owners o
                LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id
                WHERE o.id = $1
                GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.partner_name, o.partner_email, o.partner_phone;
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
