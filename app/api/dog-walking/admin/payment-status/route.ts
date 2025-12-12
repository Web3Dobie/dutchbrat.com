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
    const view = searchParams.get("view") || "awaiting_payment"; // awaiting_payment, paid, all

    const client = await pool.connect();

    try {
        // Build WHERE clause based on view
        let whereClause = "";
        switch (view) {
            case "awaiting_payment":
                whereClause = "WHERE b.status = 'completed'";
                break;
            case "paid":
                whereClause = "WHERE b.status = 'completed & paid'";
                break;
            case "all":
                whereClause = "WHERE b.status IN ('completed', 'completed & paid', 'confirmed')";
                break;
            default:
                whereClause = "WHERE b.status = 'completed' AND b.price_pounds > 0";
        }

        // Fetch bookings with customer and dog information INCLUDING walk_summary
        const bookingsQuery = `
            SELECT 
                b.id,
                b.service_type,
                b.start_time,
                b.end_time,
                b.duration_minutes,
                b.price_pounds,
                b.status,
                b.walk_summary,
                b.created_at,
                o.owner_name,
                o.phone,
                o.email,
                -- Aggregate dog names for this booking
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
            ${whereClause}
            GROUP BY 
                b.id, b.service_type, b.start_time, b.end_time, b.duration_minutes, 
                b.price_pounds, b.status, b.walk_summary, b.created_at,
                o.owner_name, o.phone, o.email
            ORDER BY b.start_time DESC;
        `;

        const bookingsResult = await client.query(bookingsQuery);

        // Calculate payment statistics
        const statsQuery = `
            WITH payment_stats AS (
                SELECT 
                    -- Total amount awaiting payment (only paid services)
                    COALESCE(SUM(CASE 
                        WHEN status = 'completed' AND price_pounds > 0 
                        THEN price_pounds 
                        ELSE 0 
                    END), 0) as total_awaiting_payment,
                    
                    -- Count of bookings awaiting payment (only paid services)
                    COUNT(CASE 
                        WHEN status = 'completed' AND price_pounds > 0 
                        THEN 1 
                    END) as bookings_awaiting_payment,
                    
                    -- This month's paid amount
                    COALESCE(SUM(CASE 
                        WHEN status = 'completed & paid' 
                        AND price_pounds > 0
                        AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
                        AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
                        THEN price_pounds 
                        ELSE 0 
                    END), 0) as total_paid_this_month,
                    
                    -- This month's paid bookings count
                    COUNT(CASE 
                        WHEN status = 'completed & paid' 
                        AND price_pounds > 0
                        AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
                        AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
                        THEN 1 
                    END) as paid_bookings_this_month,
                    
                    -- This year's paid amount
                    COALESCE(SUM(CASE 
                        WHEN status = 'completed & paid' 
                        AND price_pounds > 0
                        AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
                        THEN price_pounds 
                        ELSE 0 
                    END), 0) as total_paid_this_year,
                    
                    -- This year's paid bookings count
                    COUNT(CASE 
                        WHEN status = 'completed & paid' 
                        AND price_pounds > 0
                        AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
                        THEN 1 
                    END) as paid_bookings_this_year
                    
                FROM hunters_hounds.bookings
            )
            SELECT * FROM payment_stats;
        `;

        const statsResult = await client.query(statsQuery);

        // Transform bookings data
        const bookings = bookingsResult.rows.map(row => ({
            id: row.id,
            service_type: row.service_type,
            start_time: row.start_time,
            end_time: row.end_time,
            duration_minutes: row.duration_minutes,
            price_pounds: row.price_pounds ? parseFloat(row.price_pounds) : null,
            status: row.status,
            walk_summary: row.walk_summary, // Include walk summary in response
            owner_name: row.owner_name,
            phone: row.phone,
            email: row.email,
            dog_names: row.dog_names || [],
            created_at: row.created_at
        }));

        const stats = statsResult.rows[0] || {
            total_awaiting_payment: 0,
            bookings_awaiting_payment: 0,
            total_paid_this_month: 0,
            paid_bookings_this_month: 0,
            total_paid_this_year: 0,
            paid_bookings_this_year: 0
        };

        return NextResponse.json({
            success: true,
            bookings: bookings,
            stats: {
                total_awaiting_payment: parseFloat(stats.total_awaiting_payment),
                bookings_awaiting_payment: parseInt(stats.bookings_awaiting_payment),
                total_paid_this_month: parseFloat(stats.total_paid_this_month),
                paid_bookings_this_month: parseInt(stats.paid_bookings_this_month),
                total_paid_this_year: parseFloat(stats.total_paid_this_year),
                paid_bookings_this_year: parseInt(stats.paid_bookings_this_year)
            },
            view: view
        });

    } catch (error) {
        console.error("Payment status fetch error:", error);
        return NextResponse.json(
            { error: "Database error occurred while fetching payment status" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}