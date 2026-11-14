import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { sendEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT a.id, a.name, a.animal_type, a.photo_url, a.bio, a.status, a.created_at,
                   s.id AS shelter_id, s.name AS shelter_name
            FROM helping_paws.animals a
            JOIN helping_paws.shelters s ON s.id = a.shelter_id
            ORDER BY a.status, a.name
        `);
        const shelters = await pool.query('SELECT id, name FROM helping_paws.shelters ORDER BY name');
        return NextResponse.json({ animals: result.rows, shelters: shelters.rows });
    } catch (error) {
        console.error('[Helping Paws] Admin animals GET error:', error);
        return NextResponse.json({ error: 'Failed to load animals' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { name, animalType = 'dog', shelterId, photoUrl, bio } = await request.json();

        if (!name || !shelterId) {
            return NextResponse.json({ error: 'name and shelterId are required' }, { status: 400 });
        }

        const pool = getPool();
        const result = await pool.query(`
            INSERT INTO helping_paws.animals (name, animal_type, shelter_id, photo_url, bio)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, animal_type, status
        `, [name.trim(), animalType, shelterId, photoUrl || null, bio?.trim() || null]);

        return NextResponse.json({ ok: true, animal: result.rows[0] }, { status: 201 });
    } catch (error) {
        console.error('[Helping Paws] Admin animals POST error:', error);
        return NextResponse.json({ error: 'Failed to create animal' }, { status: 500 });
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
        await pool.query('DELETE FROM helping_paws.animals WHERE id = $1', [id]);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Helping Paws] Admin animals DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete animal' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const { id, status, name, photoUrl, bio } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const pool = getPool();
        await pool.query(`
            UPDATE helping_paws.animals
            SET status    = COALESCE($2, status),
                name      = COALESCE($3, name),
                photo_url = COALESCE($4, photo_url),
                bio       = COALESCE($5, bio)
            WHERE id = $1
        `, [id, status || null, name?.trim() || null, photoUrl || null, bio?.trim() || null]);

        if (status === 'deceased') {
            const recipients = await pool.query(`
                SELECT p.display_name, p.email, a.name AS animal_name, s.name AS shelter_name
                FROM helping_paws.participant_animals pa
                JOIN helping_paws.participants p ON p.id = pa.participant_id
                JOIN helping_paws.animals a ON a.id = pa.animal_id
                JOIN helping_paws.shelters s ON s.id = a.shelter_id
                WHERE pa.animal_id = $1 AND p.email IS NOT NULL
            `, [id]);

            const emailPromises = recipients.rows.map((r: { display_name: string; email: string; animal_name: string; shelter_name: string }) => {
                const html = `
                    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                      <h2 style="color:#3b82f6">🐾 Helping Paws</h2>
                      <p>Hi ${r.display_name},</p>
                      <p>We have some sad news to share. <strong>${r.animal_name}</strong> from ${r.shelter_name} has passed away.</p>
                      <p>Your steps over the past weeks made a real difference to ${r.animal_name}'s time at the rescue — the treats, meals, and care your walking helped fund meant they were loved and looked after right to the end. Thank you for that.</p>
                      <p>When you're ready, please visit the leaderboard to choose a new rescue dog to support. There are more dogs at ${r.shelter_name} who need exactly the same care.</p>
                      <p>Thank you for being part of this.</p>
                      <p>— Hunter</p>
                      <p style="color:#6b7280;font-size:0.85em">Hunter's Hounds · <a href="https://hunters-hounds.london">hunters-hounds.london</a></p>
                    </div>
                `;
                return sendEmail({
                    to: r.email,
                    subject: `Helping Paws — a sad update about ${r.animal_name}`,
                    html,
                }).catch(err => console.error(`[Helping Paws] Deceased notification failed for ${r.email}:`, err));
            });

            await Promise.all(emailPromises);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Helping Paws] Admin animals PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 });
    }
}
