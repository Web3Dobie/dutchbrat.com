import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = getPool();

// GET - Fetch overrides for a date range
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
        return NextResponse.json(
            { error: "start_date and end_date parameters are required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT id, override_date, max_walks, created_at
             FROM hunters_hounds.walk_limit_overrides
             WHERE override_date >= $1::date AND override_date <= $2::date
             ORDER BY override_date ASC`,
            [startDate, endDate]
        );

        return NextResponse.json({
            success: true,
            overrides: result.rows,
            default_limit: parseInt(process.env.MAX_WALKS_DURING_SITTING || '4', 10),
        });
    } catch (error) {
        console.error("Fetch walk limit overrides error:", error);
        return NextResponse.json(
            { error: "Failed to fetch walk limit overrides" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// POST - Create or update override for a specific date (upsert)
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data = await request.json();
        const { override_date, max_walks } = data;

        if (!override_date) {
            return NextResponse.json(
                { error: "override_date is required" },
                { status: 400 }
            );
        }

        if (max_walks !== null && max_walks !== undefined) {
            const parsed = parseInt(max_walks, 10);
            if (isNaN(parsed) || parsed < 0) {
                return NextResponse.json(
                    { error: "max_walks must be a non-negative integer or null for unlimited" },
                    { status: 400 }
                );
            }
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO hunters_hounds.walk_limit_overrides (override_date, max_walks)
                 VALUES ($1::date, $2)
                 ON CONFLICT (override_date)
                 DO UPDATE SET max_walks = EXCLUDED.max_walks
                 RETURNING id, override_date, max_walks, created_at`,
                [override_date, max_walks ?? null]
            );

            return NextResponse.json({
                success: true,
                override: result.rows[0],
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Create/update walk limit override error:", error);
        return NextResponse.json(
            { error: "Failed to save walk limit override" },
            { status: 500 }
        );
    }
}

// DELETE - Remove override for a specific date (reverts to default limit)
export async function DELETE(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data = await request.json();
        const { override_date } = data;

        if (!override_date) {
            return NextResponse.json(
                { error: "override_date is required" },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `DELETE FROM hunters_hounds.walk_limit_overrides
                 WHERE override_date = $1::date
                 RETURNING id`,
                [override_date]
            );

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { error: "No override found for this date" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                message: "Override removed, default limit restored",
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Delete walk limit override error:", error);
        return NextResponse.json(
            { error: "Failed to delete walk limit override" },
            { status: 500 }
        );
    }
}
