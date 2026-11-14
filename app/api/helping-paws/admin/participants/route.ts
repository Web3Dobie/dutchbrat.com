import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT p.id, p.username, p.display_name, p.email, p.hh_owner_id,
                   o.owner_name AS hh_owner_name,
                   a.name AS animal_name, a.status AS animal_status,
                   p.created_at
            FROM helping_paws.participants p
            LEFT JOIN hunters_hounds.owners o ON o.id = p.hh_owner_id
            LEFT JOIN helping_paws.participant_animals pa ON pa.participant_id = p.id
            LEFT JOIN helping_paws.animals a ON a.id = pa.animal_id
            ORDER BY p.display_name
        `);
        return NextResponse.json({ participants: result.rows });
    } catch (error) {
        console.error('[Helping Paws] Admin participants GET error:', error);
        return NextResponse.json({ error: 'Failed to load participants' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { displayName, username, password, email, hhOwnerId } = await request.json();

        if (!displayName || !username || !password) {
            return NextResponse.json({ error: 'displayName, username, and password are required' }, { status: 400 });
        }

        const pool = getPool();

        let resolvedEmail = email?.trim() || null;
        if (!resolvedEmail && hhOwnerId) {
            const ownerRes = await pool.query(
                'SELECT email FROM hunters_hounds.owners WHERE id = $1',
                [hhOwnerId]
            );
            resolvedEmail = ownerRes.rows[0]?.email?.trim() || null;
        }

        const result = await pool.query(`
            INSERT INTO helping_paws.participants (display_name, username, password, email, hh_owner_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, display_name, username
        `, [displayName.trim(), username.trim().toLowerCase(), password, resolvedEmail, hhOwnerId || null]);

        return NextResponse.json({ ok: true, participant: result.rows[0] }, { status: 201 });
    } catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }
        console.error('[Helping Paws] Admin participants POST error:', error);
        return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { id, hhOwnerId } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const pool = getPool();

        let hhEmail: string | null = null;
        if (hhOwnerId) {
            const ownerRes = await pool.query(
                'SELECT email FROM hunters_hounds.owners WHERE id = $1',
                [hhOwnerId]
            );
            hhEmail = ownerRes.rows[0]?.email?.trim() || null;
        }

        await pool.query(`
            UPDATE helping_paws.participants
            SET hh_owner_id = $1,
                email       = CASE WHEN email IS NULL THEN $3 ELSE email END
            WHERE id = $2
        `, [hhOwnerId || null, id, hhEmail]);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Helping Paws] Admin participants PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 });
    }
}
