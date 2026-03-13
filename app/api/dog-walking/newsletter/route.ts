import { NextResponse } from "next/server";
import { getPool } from '@/lib/database';

export const dynamic = 'force-dynamic';

const pool = getPool();

// GET - Public: list all sent newsletters (no auth required)
export async function GET() {
    const client = await pool.connect();

    try {
        const result = await client.query(`
            SELECT id, title, content_json, sent_at
            FROM hunters_hounds.newsletters
            WHERE sent_at IS NOT NULL
            ORDER BY sent_at DESC
        `);

        return NextResponse.json({
            success: true,
            newsletters: result.rows.map(row => ({
                id: row.id,
                title: row.title,
                content: row.content_json,
                sent_at: row.sent_at,
            })),
        });
    } catch (error) {
        console.error("Public newsletter list error:", error);
        return NextResponse.json({ error: "Failed to fetch newsletters" }, { status: 500 });
    } finally {
        client.release();
    }
}
