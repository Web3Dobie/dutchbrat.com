import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { setParticipantCookie } from '@/lib/helpingPawsAuth';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // 10 attempts per 15 minutes per IP. Passwords here are still compared in
        // plaintext against the participants table (see the note in the audit), so
        // slowing guessing matters more than usual until that is hashed.
        const ip = clientIp(request);
        const limit = rateLimit(`helping-paws-auth:${ip}`, 10, 15 * 60);
        if (!limit.allowed) {
            console.warn(`[Helping Paws Auth] Rate limit hit from ${ip}`);
            return tooManyRequests(limit.retryAfter);
        }

        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const pool = getPool();
        const result = await pool.query(
            'SELECT id, display_name FROM helping_paws.participants WHERE username = $1 AND password = $2',
            [username.trim(), password]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
        }

        const participant = result.rows[0];
        const response = NextResponse.json({ ok: true, displayName: participant.display_name });
        setParticipantCookie(response, participant.id);
        return response;

    } catch (error) {
        console.error('[Helping Paws] Login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
