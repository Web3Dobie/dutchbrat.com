import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials } from '@/lib/auth';
import { ADMIN_COOKIE, SESSION_COOKIE_OPTIONS, SESSION_TTL_SECONDS, signSession } from '@/lib/session';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// 10 attempts per 15 minutes per IP. Before this there was no limit at all.
const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
    try {
        const ip = clientIp(request);
        const limit = rateLimit(`admin-auth:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS);
        if (!limit.allowed) {
            console.warn(`[Admin Auth] Rate limit hit from ${ip}`);
            return tooManyRequests(limit.retryAfter);
        }

        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const matchedUser = verifyAdminCredentials(username, password);

        if (!matchedUser) {
            console.warn(`[Admin Auth] Failed login for '${username}' from ${ip}`);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // The cookie is now a signed token rather than the literal 'authenticated',
        // so it cannot be forged without SESSION_SECRET.
        const token = signSession({ realm: 'admin', username: matchedUser }, SESSION_TTL_SECONDS);

        const response = NextResponse.json({ success: true });
        response.cookies.set(ADMIN_COOKIE, token, SESSION_COOKIE_OPTIONS);
        console.log(`[Admin Auth] Session issued for '${matchedUser}' from ${ip}`);
        return response;
    } catch (error) {
        console.error('Dog-walking admin auth error:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
