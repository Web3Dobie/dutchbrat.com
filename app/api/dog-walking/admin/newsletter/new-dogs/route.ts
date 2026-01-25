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

// GET - Fetch dogs whose first service was in the specified month
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    // Default to current month if not specified
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const month = searchParams.get("month") || (new Date().getMonth() + 1).toString();

    const client = await pool.connect();

    try {
        // Find dogs whose FIRST booking was in the specified month
        // This means they're new to the pack that month
        const query = `
            SELECT DISTINCT
                d.id as dog_id,
                d.dog_name,
                d.dog_breed,
                d.image_filename,
                o.id as owner_id,
                o.owner_name,
                MIN(b.start_time) as first_service_date
            FROM hunters_hounds.dogs d
            JOIN hunters_hounds.owners o ON d.owner_id = o.id
            JOIN hunters_hounds.bookings b ON (b.dog_id_1 = d.id OR b.dog_id_2 = d.id)
            WHERE b.status IN ('confirmed', 'completed', 'completed & paid')
            GROUP BY d.id, d.dog_name, d.dog_breed, d.image_filename, o.id, o.owner_name
            HAVING
                EXTRACT(YEAR FROM MIN(b.start_time)) = $1
                AND EXTRACT(MONTH FROM MIN(b.start_time)) = $2
            ORDER BY first_service_date ASC;
        `;

        const result = await client.query(query, [parseInt(year), parseInt(month)]);

        return NextResponse.json({
            success: true,
            new_pack_members: result.rows.map(row => ({
                dog_id: row.dog_id,
                dog_name: row.dog_name,
                breed: row.dog_breed,
                image_filename: row.image_filename,
                owner_id: row.owner_id,
                owner_name: row.owner_name,
                first_service_date: row.first_service_date
            })),
            month: parseInt(month),
            year: parseInt(year),
            count: result.rows.length
        });

    } catch (error) {
        console.error("New dogs fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch new pack members" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
