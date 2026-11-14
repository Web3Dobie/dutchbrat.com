import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT id, owner_name
            FROM hunters_hounds.owners
            ORDER BY owner_name
        `);
        return NextResponse.json({ owners: result.rows });
    } catch (error) {
        console.error('[Helping Paws] HH owners GET error:', error);
        return NextResponse.json({ error: 'Failed to load owners' }, { status: 500 });
    }
}
