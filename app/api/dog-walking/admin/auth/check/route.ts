import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // Verifies the HMAC signature and expiry rather than comparing the cookie to
    // a literal string, which is what this used to do.
    const session = getAdminSession(request);

    return NextResponse.json({
        authenticated: session !== null,
        username: session?.username ?? null,
    });
}
