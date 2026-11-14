import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { getPrizeForRank, getWeekStart, formatWeekStart } from '@/lib/helpingPawsTiers';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
    try {
        const pool = getPool();
        const today = new Date().toISOString().split('T')[0];
        const weekStart = formatWeekStart(getWeekStart());

        // Ranked leaderboard: all participants, week paws, today's tier, streak
        const leaderboardResult = await pool.query(`
            WITH week_paws AS (
                SELECT participant_id,
                       SUM(paws_earned) AS total_paws,
                       COUNT(*) FILTER (WHERE steps >= 2500) AS active_days
                FROM helping_paws.step_contributions
                WHERE log_date >= $1
                GROUP BY participant_id
            ),
            today_log AS (
                SELECT participant_id, steps, tier
                FROM helping_paws.step_contributions
                WHERE log_date = $2
            ),
            streak AS (
                SELECT participant_id, COUNT(*) AS streak_days
                FROM (
                    SELECT participant_id, log_date,
                           ROW_NUMBER() OVER (PARTITION BY participant_id ORDER BY log_date DESC) AS rn,
                           MAX(log_date) OVER (PARTITION BY participant_id) AS latest_date
                    FROM helping_paws.step_contributions
                    WHERE steps >= 2500
                ) numbered
                WHERE log_date = latest_date - (rn - 1)::int
                GROUP BY participant_id
            )
            SELECT
                p.id AS participant_id,
                p.display_name,
                a.name AS animal_name,
                a.photo_url AS animal_photo,
                COALESCE(tl.steps, 0) AS today_steps,
                COALESCE(tl.tier, 'none') AS today_tier,
                COALESCE(wp.total_paws, 0) AS week_paws,
                COALESCE(st.streak_days, 0) AS streak,
                RANK() OVER (ORDER BY COALESCE(wp.total_paws, 0) DESC) AS rank
            FROM helping_paws.participants p
            LEFT JOIN helping_paws.participant_animals pa ON pa.participant_id = p.id
            LEFT JOIN helping_paws.animals a ON a.id = pa.animal_id
            LEFT JOIN week_paws wp ON wp.participant_id = p.id
            LEFT JOIN today_log tl ON tl.participant_id = p.id
            LEFT JOIN streak st ON st.participant_id = p.id
            ORDER BY week_paws DESC, p.display_name
        `, [weekStart, today]);

        const rows = leaderboardResult.rows.map(row => ({
            ...row,
            week_paws: parseFloat(row.week_paws),
            rank: parseInt(row.rank),
            prize: [1, 2, 3].includes(parseInt(row.rank))
                ? getPrizeForRank(parseInt(row.rank) as 1 | 2 | 3)
                : null,
        }));

        // Weekly package for sponsor banner
        const packageResult = await pool.query(`
            SELECT items_description, sponsor_name, sponsor_url, sponsor_logo_path
            FROM helping_paws.weekly_packages
            WHERE week_start = $1
        `, [weekStart]);

        // Shelter name for banner
        const shelterResult = await pool.query(`
            SELECT DISTINCT s.name
            FROM helping_paws.shelters s
            JOIN helping_paws.weekly_packages wp ON wp.shelter_id = s.id
            WHERE wp.week_start = $1
        `, [weekStart]);

        return NextResponse.json({
            leaderboard: rows,
            weeklyPackage: packageResult.rows[0] || null,
            shelterName: shelterResult.rows[0]?.name || null,
            weekStart,
        });

    } catch (error) {
        console.error('[Helping Paws] Leaderboard error:', error);
        return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
    }
}
