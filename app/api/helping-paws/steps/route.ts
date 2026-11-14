import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isParticipantAuthenticated, getParticipantId, participantUnauthorizedResponse } from '@/lib/helpingPawsAuth';
import { getTierFromSteps, getBasePawsFromSteps, getPawsWithMultiplier, getWeekStart, formatWeekStart } from '@/lib/helpingPawsTiers';

export const dynamic = 'force-dynamic';

// GET: today's log + 7-day history + weekly paw total + leaderboard rank
export async function GET(request: NextRequest) {
    if (!isParticipantAuthenticated(request)) return participantUnauthorizedResponse();
    const participantId = getParticipantId(request)!;

    try {
        const pool = getPool();
        const today = new Date().toISOString().split('T')[0];
        const weekStart = formatWeekStart(getWeekStart());

        // Chosen animal and shelter
        const animalResult = await pool.query(`
            SELECT a.id AS animal_id, a.name AS animal_name, a.photo_url, a.status,
                   s.id AS shelter_id, s.name AS shelter_name
            FROM helping_paws.participant_animals pa
            JOIN helping_paws.animals a ON a.id = pa.animal_id
            JOIN helping_paws.shelters s ON s.id = a.shelter_id
            WHERE pa.participant_id = $1
        `, [participantId]);

        const animal = animalResult.rows[0] || null;

        // Today's log
        const todayResult = await pool.query(`
            SELECT steps, tier, paws_earned, ads_watched
            FROM helping_paws.step_contributions
            WHERE participant_id = $1 AND log_date = $2
        `, [participantId, today]);

        // 7-day history
        const historyResult = await pool.query(`
            SELECT log_date::text, steps, tier, paws_earned
            FROM helping_paws.step_contributions
            WHERE participant_id = $1
              AND log_date >= (CURRENT_DATE - INTERVAL '6 days')
            ORDER BY log_date DESC
        `, [participantId]);

        // Weekly paw total + current rank
        const weekResult = await pool.query(`
            SELECT participant_id,
                   SUM(paws_earned) AS week_paws,
                   RANK() OVER (ORDER BY SUM(paws_earned) DESC) AS rank
            FROM helping_paws.step_contributions
            WHERE log_date >= $1
            GROUP BY participant_id
        `, [weekStart]);

        const myWeekRow = weekResult.rows.find(r => r.participant_id === participantId);
        const weekPaws = myWeekRow ? parseFloat(myWeekRow.week_paws) : 0;
        const rank = myWeekRow ? parseInt(myWeekRow.rank) : null;

        // Yesterday's date for nudge logic
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const yesterdayResult = await pool.query(`
            SELECT steps FROM helping_paws.step_contributions
            WHERE participant_id = $1 AND log_date = $2
        `, [participantId, yesterdayStr]);

        const missedYesterday = yesterdayResult.rows.length === 0;

        // Current weekly package for the shelter
        const packageResult = await pool.query(`
            SELECT items_description, sponsor_name, sponsor_url
            FROM helping_paws.weekly_packages
            WHERE week_start = $1
        `, [weekStart]);

        // Personalised dog video — most recent clip for the participant's linked HH owner
        const videoResult = await pool.query(`
            SELECT cm.file_path
            FROM helping_paws.participants p
            JOIN hunters_hounds.client_media cm ON cm.owner_id = p.hh_owner_id
            WHERE p.id = $1
              AND cm.media_type = 'video'
            ORDER BY cm.taken_at DESC NULLS LAST
            LIMIT 1
        `, [participantId]);
        const videoFilePath = videoResult.rows[0]?.file_path || null;

        return NextResponse.json({
            animal,
            today: todayResult.rows[0] || null,
            history: historyResult.rows,
            weekPaws,
            rank,
            missedYesterday,
            weeklyPackage: packageResult.rows[0] || null,
            videoUrl: videoFilePath ? `/api/dog-walking/client-media/${videoFilePath}` : null,
        });

    } catch (error) {
        console.error('[Helping Paws] Steps GET error:', error);
        return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
    }
}

// POST: log or update today's steps
export async function POST(request: NextRequest) {
    if (!isParticipantAuthenticated(request)) return participantUnauthorizedResponse();
    const participantId = getParticipantId(request)!;

    try {
        const { steps, adsWatched = 0 } = await request.json();

        if (typeof steps !== 'number' || steps < 0 || !Number.isInteger(steps)) {
            return NextResponse.json({ error: 'steps must be a non-negative integer' }, { status: 400 });
        }
        if (![0, 1, 2].includes(adsWatched)) {
            return NextResponse.json({ error: 'adsWatched must be 0, 1, or 2' }, { status: 400 });
        }

        const pool = getPool();
        const today = new Date().toISOString().split('T')[0];

        // Get chosen animal/shelter
        const animalResult = await pool.query(`
            SELECT a.shelter_id
            FROM helping_paws.participant_animals pa
            JOIN helping_paws.animals a ON a.id = pa.animal_id
            WHERE pa.participant_id = $1
        `, [participantId]);

        if (animalResult.rows.length === 0) {
            return NextResponse.json({ error: 'Please choose a dog first' }, { status: 400 });
        }

        const shelterId = animalResult.rows[0].shelter_id;
        const tier = getTierFromSteps(steps);
        const basePaws = getBasePawsFromSteps(steps);
        const pawsEarned = getPawsWithMultiplier(basePaws, adsWatched as 0 | 1 | 2);

        await pool.query(`
            INSERT INTO helping_paws.step_contributions
              (participant_id, shelter_id, log_date, steps, tier, paws_earned, ads_watched, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (participant_id, log_date)
            DO UPDATE SET
              steps = EXCLUDED.steps,
              tier = EXCLUDED.tier,
              paws_earned = EXCLUDED.paws_earned,
              ads_watched = EXCLUDED.ads_watched,
              updated_at = NOW()
        `, [participantId, shelterId, today, steps, tier, pawsEarned, adsWatched]);

        return NextResponse.json({ ok: true, tier, pawsEarned, adsWatched });

    } catch (error) {
        console.error('[Helping Paws] Steps POST error:', error);
        return NextResponse.json({ error: 'Failed to log steps' }, { status: 500 });
    }
}
