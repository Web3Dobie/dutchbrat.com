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
    try {
        const client = await pool.connect();

        try {
            // Get all bookings that are NOT 'completed & paid' (editable bookings)
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
                    o.owner_name,
                    o.phone,
                    o.email,
                    array_agg(
                        CASE 
                            WHEN d1.id IS NOT NULL THEN d1.dog_name
                            WHEN d2.id IS NOT NULL THEN d2.dog_name
                            ELSE NULL
                        END
                    ) FILTER (WHERE d1.id IS NOT NULL OR d2.id IS NOT NULL) as dog_names
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                WHERE b.status != 'completed & paid'
                GROUP BY b.id, b.status, b.service_type, b.price_pounds, b.start_time, 
                         b.end_time, b.duration_minutes, b.created_at, o.owner_name, o.phone, o.email
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