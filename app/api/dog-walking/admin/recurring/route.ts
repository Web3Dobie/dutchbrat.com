import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from "@/lib/database";

const pool = getPool();

/**
 * Every recurring series, with live counts taken from the bookings themselves
 * rather than the stored totals on booking_series — those are written once at
 * creation and drift as soon as anything is cancelled or rescheduled by hand.
 */
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    const includeCancelled = new URL(request.url).searchParams.get("include_cancelled") === "true";

    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT
                bs.id,
                bs.owner_id,
                bs.service_type,
                bs.duration_minutes,
                bs.recurrence_pattern,
                bs.days_of_week,
                bs.preferred_time,
                bs.start_date,
                bs.end_date,
                bs.status,
                bs.notes,
                bs.created_at,
                o.owner_name,
                o.email,
                d1.dog_name AS dog_name_1,
                d2.dog_name AS dog_name_2,
                COUNT(b.id) FILTER (WHERE b.status = 'confirmed')                          AS confirmed_total,
                COUNT(b.id) FILTER (WHERE b.status = 'confirmed' AND b.start_time > NOW()) AS upcoming,
                COUNT(b.id) FILTER (WHERE b.status = 'cancelled')                          AS cancelled_total,
                MIN(b.start_time) FILTER (WHERE b.status = 'confirmed' AND b.start_time > NOW()) AS next_walk,
                MAX(b.start_time) FILTER (WHERE b.status = 'confirmed')                    AS last_walk
             FROM hunters_hounds.booking_series bs
             JOIN hunters_hounds.owners o ON o.id = bs.owner_id
             JOIN hunters_hounds.dogs d1 ON d1.id = bs.dog_id_1
             LEFT JOIN hunters_hounds.dogs d2 ON d2.id = bs.dog_id_2
             LEFT JOIN hunters_hounds.bookings b ON b.series_id = bs.id
             WHERE ($1::boolean OR bs.status <> 'cancelled')
             GROUP BY bs.id, o.owner_name, o.email, d1.dog_name, d2.dog_name
             ORDER BY (MIN(b.start_time) FILTER (WHERE b.status = 'confirmed' AND b.start_time > NOW())) NULLS LAST,
                      bs.id DESC`,
            [includeCancelled]
        );

        return NextResponse.json({
            series: result.rows.map((r) => ({
                ...r,
                confirmed_total: Number(r.confirmed_total),
                upcoming: Number(r.upcoming),
                cancelled_total: Number(r.cancelled_total),
            })),
        });
    } catch (error) {
        console.error("Admin series list error:", error);
        return NextResponse.json({ error: "Failed to load series" }, { status: 500 });
    } finally {
        client.release();
    }
}
