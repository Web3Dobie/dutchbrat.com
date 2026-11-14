import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT id, name, location, social_media_url, created_at
            FROM helping_paws.shelters
            ORDER BY name
        `);
        return NextResponse.json({ shelters: result.rows });
    } catch (error) {
        console.error('[Helping Paws] Admin shelters GET error:', error);
        return NextResponse.json({ error: 'Failed to load shelters' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { name, location, socialMediaUrl } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        const pool = getPool();
        const result = await pool.query(`
            INSERT INTO helping_paws.shelters (name, location, social_media_url)
            VALUES ($1, $2, $3)
            RETURNING id, name, location, social_media_url
        `, [name.trim(), location?.trim() || null, socialMediaUrl?.trim() || null]);

        return NextResponse.json({ ok: true, shelter: result.rows[0] }, { status: 201 });
    } catch (error) {
        console.error('[Helping Paws] Admin shelters POST error:', error);
        return NextResponse.json({ error: 'Failed to create shelter' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { id, name, location, socialMediaUrl } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const pool = getPool();
        await pool.query(`
            UPDATE helping_paws.shelters
            SET name             = COALESCE($2, name),
                location         = $3,
                social_media_url = $4
            WHERE id = $1
        `, [id, name?.trim() || null, location?.trim() || null, socialMediaUrl?.trim() || null]);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Helping Paws] Admin shelters PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update shelter' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const pool = getPool();

        const animals = await pool.query(
            'SELECT name FROM helping_paws.animals WHERE shelter_id = $1 ORDER BY name',
            [id]
        );

        if (animals.rowCount && animals.rowCount > 0) {
            const names = animals.rows.map((a: { name: string }) => a.name).join(', ');
            return NextResponse.json(
                { error: `Cannot delete — ${animals.rowCount} animal(s) still linked: ${names}. Remove them first.` },
                { status: 409 }
            );
        }

        await pool.query('DELETE FROM helping_paws.shelters WHERE id = $1', [id]);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Helping Paws] Admin shelters DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete shelter' }, { status: 500 });
    }
}
