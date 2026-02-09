import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';

export const dynamic = 'force-dynamic';

// Database Connection
const pool = getPool();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("owner_id");

    // Validation
    if (!ownerId) {
        return NextResponse.json(
            { error: "owner_id parameter is required" },
            { status: 400 }
        );
    }

    const ownerIdNum = parseInt(ownerId);
    if (isNaN(ownerIdNum)) {
        return NextResponse.json(
            { error: "owner_id must be a valid number" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Fetch all bookings for the customer with dog information, walk_summary, and series info
        const query = `
            SELECT
                b.id,
                b.service_type,
                b.start_time,
                b.end_time,
                b.duration_minutes,
                b.status,
                b.price_pounds,
                b.walk_summary,
                b.created_at,
                b.series_id,
                b.series_index,
                bs.recurrence_pattern,
                bs.status AS series_status,
                ARRAY_REMOVE(ARRAY[d1.dog_name, d2.dog_name], NULL) as dog_names
            FROM hunters_hounds.bookings b
            LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
            LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
            LEFT JOIN hunters_hounds.booking_series bs ON b.series_id = bs.id
            WHERE b.owner_id = $1
            ORDER BY
                CASE
                    WHEN b.status = 'confirmed' THEN 0
                    WHEN b.status = 'completed' THEN 1
                    ELSE 2
                END,
                CASE
                    WHEN b.status = 'confirmed' THEN b.start_time
                END ASC,
                CASE
                    WHEN b.status = 'completed' THEN b.start_time
                END DESC,
                CASE
                    WHEN b.status NOT IN ('confirmed', 'completed') THEN b.start_time
                END DESC
        `;

        const result = await client.query(query, [ownerIdNum]);

        // Process the results to ensure proper formatting
        const bookings = result.rows.map(row => ({
            id: row.id,
            service_type: row.service_type,
            start_time: row.start_time,
            end_time: row.end_time,
            duration_minutes: row.duration_minutes,
            status: row.status,
            price_pounds: row.price_pounds ? parseFloat(row.price_pounds) : null,
            walk_summary: row.walk_summary,
            dog_names: row.dog_names || [],
            created_at: row.created_at,
            // Series fields for recurring bookings
            series_id: row.series_id,
            series_index: row.series_index,
            recurrence_pattern: row.recurrence_pattern,
            series_status: row.series_status,
            is_recurring: !!row.series_id,
        }));

        return NextResponse.json({
            success: true,
            bookings: bookings,
            total_count: bookings.length
        });

    } catch (error) {
        console.error("Customer bookings fetch error:", error);
        return NextResponse.json(
            { error: "Database error occurred while fetching bookings" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}