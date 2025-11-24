import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";

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
        // Fetch all bookings for the customer with dog information AND walk_summary
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
                -- Aggregate dog names for this booking
                array_agg(
                    CASE 
                        WHEN d1.id IS NOT NULL THEN d1.dog_name
                        WHEN d2.id IS NOT NULL THEN d2.dog_name
                        ELSE NULL
                    END
                ) FILTER (WHERE d1.id IS NOT NULL OR d2.id IS NOT NULL) as dog_names
            FROM hunters_hounds.bookings b
            LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
            LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
            WHERE b.owner_id = $1
            GROUP BY b.id, b.service_type, b.start_time, b.end_time, b.duration_minutes, b.status, b.price_pounds, b.walk_summary, b.created_at
            ORDER BY b.start_time ASC;
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
            walk_summary: row.walk_summary, // NEW: Include walk summary
            dog_names: row.dog_names || [],
            created_at: row.created_at
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