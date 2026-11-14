import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
    return response;
}
