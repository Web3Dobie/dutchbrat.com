import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT il.id, il.items_description, il.dispatch_date, il.delivery_photo_url,
                   il.social_media_url, il.created_at,
                   a.name AS animal_name, s.name AS shelter_name
            FROM helping_paws.impact_log il
            JOIN helping_paws.animals a ON a.id = il.animal_id
            JOIN helping_paws.shelters s ON s.id = a.shelter_id
            ORDER BY il.dispatch_date DESC
        `);
        const animals = await pool.query(`
            SELECT a.id, a.name, s.name AS shelter_name
            FROM helping_paws.animals a
            JOIN helping_paws.shelters s ON s.id = a.shelter_id
            ORDER BY a.name
        `);
        return NextResponse.json({ entries: result.rows, animals: animals.rows });
    } catch (error) {
        console.error('[Helping Paws] Admin impact-log GET error:', error);
        return NextResponse.json({ error: 'Failed to load impact log' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { animalId, itemsDescription, dispatchDate, deliveryPhotoUrl, socialMediaUrl, weeklyPackageId } = await request.json();

        if (!animalId || !itemsDescription || !dispatchDate) {
            return NextResponse.json({ error: 'animalId, itemsDescription, and dispatchDate are required' }, { status: 400 });
        }

        const pool = getPool();
        const result = await pool.query(`
            INSERT INTO helping_paws.impact_log
              (animal_id, weekly_package_id, items_description, dispatch_date, delivery_photo_url, social_media_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [animalId, weeklyPackageId || null, itemsDescription.trim(), dispatchDate, deliveryPhotoUrl || null, socialMediaUrl || null]);

        return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
    } catch (error) {
        console.error('[Helping Paws] Admin impact-log POST error:', error);
        return NextResponse.json({ error: 'Failed to add impact log entry' }, { status: 500 });
    }
}
