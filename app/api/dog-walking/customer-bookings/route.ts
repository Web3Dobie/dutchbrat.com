import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { requireOwner } from '@/lib/customerAuth';
import { sharedWithSql } from '@/lib/sharedWalk';

export const dynamic = 'force-dynamic';

// Database Connection
const pool = getPool();

export async function GET(request: NextRequest) {
    // owner_id comes from the verified session, never from the query string.
    // This endpoint previously accepted ?owner_id=N unauthenticated, so walking
    // the integers returned every client's full booking history.
    const auth = requireOwner(request);
    if ('response' in auth) return auth.response;
    const ownerIdNum = auth.ownerId;

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
                b.booking_type,
                b.status,
                b.price_pounds,
                b.cancellation_fee_pounds,
                b.walk_summary,
                b.created_at,
                b.series_id,
                b.series_index,
                b.shared_walk_id,
                -- The other household's dog on a shared walk: name only.
                ${sharedWithSql('b')} AS shared_with,
                bs.recurrence_pattern,
                bs.status AS series_status,
                ARRAY_REMOVE(ARRAY[d1.dog_name, d2.dog_name], NULL) as dog_names,
                (SELECT COUNT(*) FROM hunters_hounds.booking_notes bn WHERE bn.booking_id = b.id)::int AS note_count
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
            cancellation_fee_pounds: row.cancellation_fee_pounds ? parseFloat(row.cancellation_fee_pounds) : null,
            walk_summary: row.walk_summary,
            booking_type: row.booking_type,
            note_count: row.note_count || 0,
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