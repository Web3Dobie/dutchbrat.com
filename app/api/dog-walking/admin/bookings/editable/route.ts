import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const client = await pool.connect();

        try {
            // Get all bookings that are NOT 'completed & paid' (editable bookings)
            // Includes series information for recurring bookings
            const query = `
                SELECT
                    b.id,
                    b.status,
                    b.service_type,
                    b.price_pounds,
                    b.start_time,
                    b.end_time,
                    b.duration_minutes,
                    b.created_at,
                    b.series_id,
                    b.series_index,
                    bs.recurrence_pattern,
                    o.owner_name,
                    o.phone,
                    o.email,
                    ARRAY_REMOVE(ARRAY[d1.dog_name, d2.dog_name], NULL) as dog_names
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                LEFT JOIN hunters_hounds.booking_series bs ON b.series_id = bs.id
                WHERE b.status != 'completed & paid'
                ORDER BY b.start_time ASC;
            `;

            const result = await client.query(query);
            const bookings = result.rows;

            return NextResponse.json({
                success: true,
                bookings: bookings,
                count: bookings.length
            });

        } catch (error) {
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Fetch editable bookings error:", error);
        return NextResponse.json(
            { error: "Failed to fetch bookings. Please try again." },
            { status: 500 }
        );
    }
}