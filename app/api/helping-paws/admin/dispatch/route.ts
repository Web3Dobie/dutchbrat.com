import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { sendEmail } from '@/lib/emailService';
import { getPrizeForRank, getWeekStart, formatWeekStart } from '@/lib/helpingPawsTiers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { weekStart: reqWeekStart } = await request.json();
        const weekStart = reqWeekStart || formatWeekStart(getWeekStart());

        const pool = getPool();

        // Load weekly summary to determine prizes and recipients
        const participantsResult = await pool.query(`
            SELECT
                p.id AS participant_id,
                p.display_name,
                p.email,
                a.name AS animal_name,
                COALESCE(SUM(sc.paws_earned), 0) AS week_paws,
                RANK() OVER (ORDER BY COALESCE(SUM(sc.paws_earned), 0) DESC,
                             COUNT(sc.id) FILTER (WHERE sc.steps >= 2500) DESC,
                             MIN(sc.updated_at)) AS rank
            FROM helping_paws.participants p
            LEFT JOIN helping_paws.participant_animals pa ON pa.participant_id = p.id
            LEFT JOIN helping_paws.animals a ON a.id = pa.animal_id
            LEFT JOIN helping_paws.step_contributions sc
                ON sc.participant_id = p.id AND sc.log_date >= $1
            GROUP BY p.id, p.display_name, p.email, a.name
            ORDER BY week_paws DESC
        `, [weekStart]);

        const packageResult = await pool.query(`
            SELECT wp.items_description, wp.sponsor_name, s.name AS shelter_name
            FROM helping_paws.weekly_packages wp
            JOIN helping_paws.shelters s ON s.id = wp.shelter_id
            WHERE wp.week_start = $1
        `, [weekStart]);

        const pkg = packageResult.rows[0];
        const shelterLine = pkg
            ? `${pkg.shelter_name} is receiving <strong>${pkg.items_description}</strong> this week, sponsored by ${pkg.sponsor_name}.`
            : 'Hunter\'s Hounds is sending treats to the rescue this week.';

        // Insert podium prizes and send emails
        const emailPromises: Promise<void>[] = [];

        for (const row of participantsResult.rows) {
            const rank = parseInt(row.rank);
            const prizeable = [1, 2, 3].includes(rank);
            const prize = prizeable ? getPrizeForRank(rank as 1 | 2 | 3) : null;

            // Upsert podium prize rows for top 3
            if (prizeable && row.animal_name) {
                const animalResult = await pool.query(`
                    SELECT pa.animal_id FROM helping_paws.participant_animals pa
                    WHERE pa.participant_id = $1
                `, [row.participant_id]);

                if (animalResult.rows[0]) {
                    await pool.query(`
                        INSERT INTO helping_paws.podium_prizes
                          (week_start, participant_id, animal_id, rank, prize_label, dispatch_status)
                        VALUES ($1, $2, $3, $4, $5, 'dispatched')
                        ON CONFLICT (week_start, rank) DO UPDATE SET
                          participant_id  = EXCLUDED.participant_id,
                          animal_id       = EXCLUDED.animal_id,
                          prize_label     = EXCLUDED.prize_label,
                          dispatch_status = 'dispatched'
                    `, [weekStart, row.participant_id, animalResult.rows[0].animal_id, rank, prize]);
                }
            }

            // Send personalised email if we have an address
            if (row.email) {
                const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🐾';
                const prizeHtml = prize
                    ? `<p>Great news — you finished <strong>${rankEmoji} ${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} place</strong> this week! A <strong>${prize.toLowerCase()}</strong> is on its way to ${row.animal_name || 'your chosen dog'}.</p>`
                    : '';

                const html = `
                    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                      <h2 style="color:#3b82f6">🐾 Helping Paws — Week Close</h2>
                      <p>Hi ${row.display_name},</p>
                      <p>This week's trial has closed. You earned <strong>${parseFloat(row.week_paws).toFixed(1)} paws</strong>.</p>
                      ${prizeHtml}
                      <p>${shelterLine}</p>
                      <p>Keep walking — the leaderboard resets Monday!</p>
                      <p style="color:#6b7280;font-size:0.85em">Sponsored by Hunter's Hounds · <a href="https://hunters-hounds.london">hunters-hounds.london</a></p>
                    </div>
                `;

                emailPromises.push(
                    sendEmail({
                        to: row.email,
                        subject: `Helping Paws — your week ${prize ? `(you won a ${prize.toLowerCase()}!)` : 'summary'} — sponsored by Hunter's Hounds`,
                        html,
                    }).catch(err => console.error(`[Helping Paws] Email failed for ${row.email}:`, err))
                );
            }
        }

        // Mark weekly package as dispatched
        if (pkg) {
            await pool.query(`
                UPDATE helping_paws.weekly_packages SET dispatch_status = 'dispatched'
                WHERE week_start = $1
            `, [weekStart]);
        }

        await Promise.all(emailPromises);

        return NextResponse.json({ ok: true, emailsSent: emailPromises.length });

    } catch (error) {
        console.error('[Helping Paws] Admin dispatch error:', error);
        return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 });
    }
}
