import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const authCookie = request.cookies.get('dog-walking-admin-auth');
    const isAuthenticated = authCookie?.value === 'authenticated';

    return NextResponse.json({
        authenticated: isAuthenticated
    });
}
