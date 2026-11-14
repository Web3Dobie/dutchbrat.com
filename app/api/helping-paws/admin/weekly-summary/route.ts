import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { getPrizeForRank, getWeekStart, formatWeekStart } from '@/lib/helpingPawsTiers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const pool = getPool();
        const { searchParams } = new URL(request.url);
        const weekStart = searchParams.get('weekStart') || formatWeekStart(getWeekStart());

        // Ranked participants for the week
        const participantsResult = await pool.query(`
            SELECT
                p.id AS participant_id,
                p.display_name,
                p.email,
                a.id AS animal_id,
                a.name AS animal_name,
                s.name AS shelter_name,
                COALESCE(SUM(sc.paws_earned), 0) AS week_paws,
                RANK() OVER (ORDER BY COALESCE(SUM(sc.paws_earned), 0) DESC,
                             COUNT(sc.id) FILTER (WHERE sc.steps >= 2500) DESC,
                             MIN(sc.updated_at)) AS rank
            FROM helping_paws.participants p
            LEFT JOIN helping_paws.participant_animals pa ON pa.participant_id = p.id
            LEFT JOIN helping_paws.animals a ON a.id = pa.animal_id
            LEFT JOIN helping_paws.shelters s ON s.id = a.shelter_id
            LEFT JOIN helping_paws.step_contributions sc
                ON sc.participant_id = p.id AND sc.log_date >= $1
            GROUP BY p.id, p.display_name, p.email, a.id, a.name, s.name
            ORDER BY week_paws DESC
        `, [weekStart]);

        // Weekly package
        const packageResult = await pool.query(`
            SELECT wp.*, s.name AS shelter_name
            FROM helping_paws.weekly_packages wp
            JOIN helping_paws.shelters s ON s.id = wp.shelter_id
            WHERE wp.week_start = $1
        `, [weekStart]);

        const participants = participantsResult.rows.map(row => ({
            ...row,
            week_paws: parseFloat(row.week_paws),
            rank: parseInt(row.rank),
            prize: [1, 2, 3].includes(parseInt(row.rank))
                ? getPrizeForRank(parseInt(row.rank) as 1 | 2 | 3)
                : null,
        }));

        return NextResponse.json({
            participants,
            weeklyPackage: packageResult.rows[0] || null,
            weekStart,
        });
    } catch (error) {
        console.error('[Helping Paws] Admin weekly-summary GET error:', error);
        return NextResponse.json({ error: 'Failed to load weekly summary' }, { status: 500 });
    }
}
