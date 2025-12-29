import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Use same credentials as Hunter Media (from environment or hardcoded fallback)
function verifyAdminCredentials(username: string, password: string): boolean {
    const validCredentials = [
        {
            username: process.env.HUNTER_ADMIN_USER || 'boyboy',
            password: process.env.HUNTER_ADMIN_PASSWORD || '010918'
        },
        { username: 'hunter', password: 'memorial' }
    ];

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
