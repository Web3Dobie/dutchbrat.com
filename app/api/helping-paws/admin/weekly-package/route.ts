import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { getWeekStart, formatWeekStart } from '@/lib/helpingPawsTiers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const pool = getPool();
        const { searchParams } = new URL(request.url);
        const weekStart = searchParams.get('weekStart') || formatWeekStart(getWeekStart());

        const result = await pool.query(`
            SELECT wp.*, s.name AS shelter_name
            FROM helping_paws.weekly_packages wp
            JOIN helping_paws.shelters s ON s.id = wp.shelter_id
            WHERE wp.week_start = $1
        `, [weekStart]);

        const shelters = await pool.query('SELECT id, name FROM helping_paws.shelters ORDER BY name');

        return NextResponse.json({
            package: result.rows[0] || null,
            shelters: shelters.rows,
            weekStart,
        });
    } catch (error) {
        console.error('[Helping Paws] Admin weekly-package GET error:', error);
        return NextResponse.json({ error: 'Failed to load weekly package' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const {
            weekStart,
            shelterId,
            itemsDescription,
            sponsorName = "Hunter's Hounds",
            sponsorUrl = 'https://hunters-hounds.london',
            sponsorLogoPath,
        } = await request.json();

        if (!weekStart || !shelterId || !itemsDescription) {
            return NextResponse.json(
                { error: 'weekStart, shelterId, and itemsDescription are required' },
                { status: 400 }
            );
        }

        const pool = getPool();
        await pool.query(`
            INSERT INTO helping_paws.weekly_packages
              (week_start, shelter_id, items_description, sponsor_name, sponsor_url, sponsor_logo_path)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (week_start) DO UPDATE SET
              shelter_id        = EXCLUDED.shelter_id,
              items_description = EXCLUDED.items_description,
              sponsor_name      = EXCLUDED.sponsor_name,
              sponsor_url       = EXCLUDED.sponsor_url,
              sponsor_logo_path = EXCLUDED.sponsor_logo_path
        `, [weekStart, shelterId, itemsDescription.trim(), sponsorName, sponsorUrl, sponsorLogoPath || null]);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Helping Paws] Admin weekly-package POST error:', error);
        return NextResponse.json({ error: 'Failed to save weekly package' }, { status: 500 });
    }
}
