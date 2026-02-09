import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Verify admin credentials from environment variables only (no hardcoded fallbacks)
function verifyAdminCredentials(username: string, password: string): boolean {
    // Primary admin credentials (required)
    if (!process.env.HUNTER_ADMIN_USER || !process.env.HUNTER_ADMIN_PASSWORD) {
        console.error('Missing required environment variables: HUNTER_ADMIN_USER and/or HUNTER_ADMIN_PASSWORD');
        return false;
    }

    const validCredentials = [
        {
            username: process.env.HUNTER_ADMIN_USER,
            password: process.env.HUNTER_ADMIN_PASSWORD
        }
    ];

    // Optional: Secondary admin credentials
    if (process.env.HUNTER_ADMIN_USER_2 && process.env.HUNTER_ADMIN_PASSWORD_2) {
        validCredentials.push({
            username: process.env.HUNTER_ADMIN_USER_2,
            password: process.env.HUNTER_ADMIN_PASSWORD_2
        });
    }

    return validCredentials.some(cred =>
        cred.username === username && cred.password === password
    );
}

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const isValid = verifyAdminCredentials(username, password);

        if (isValid) {
            const response = NextResponse.json({ success: true });
            // Set dog-walking admin specific cookie
            response.cookies.set('dog-walking-admin-auth', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/'
            });
            return response;
        } else {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Dog-walking admin auth error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
