import { NextRequest, NextResponse } from 'next/server';

/**
 * Check if the request has valid dog-walking-admin-auth cookie
 * @param req - The Next.js request object
 * @returns true if authenticated, false otherwise
 */
export function isAuthenticated(req: NextRequest): boolean {
    const authCookie = req.cookies.get('dog-walking-admin-auth');
    return authCookie?.value === 'authenticated';
}

/**
 * Standard 401 Unauthorized response for unauthenticated requests
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(): NextResponse {
    return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
    );
}
