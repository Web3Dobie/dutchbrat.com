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

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const client = await pool.connect();

    try {
        // Build WHERE clause for filters (with table alias for JOINed queries)
        const conditions: string[] = ["b.status = 'completed & paid'", "b.price_pounds > 0"];
        const params: any[] = [];
        let paramIndex = 1;

        if (customerId) {
            conditions.push(`b.owner_id = $${paramIndex}`);
            params.push(parseInt(customerId));
            paramIndex++;
        }

        if (year) {
            conditions.push(`EXTRACT(YEAR FROM b.start_time) = $${paramIndex}`);
            params.push(parseInt(year));
            paramIndex++;
        }

        if (month) {
            conditions.push(`EXTRACT(MONTH FROM b.start_time) = $${paramIndex}`);
            params.push(parseInt(month));
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const baseWhereClause = "WHERE status = 'completed & paid' AND price_pounds > 0";

        // Summary statistics query (only filters by customer, not year/month)
        const summaryQuery = `
            WITH all_time_stats AS (
                SELECT
                    COALESCE(SUM(price_pounds), 0) as all_time_revenue,
                    COUNT(*) as all_time_bookings
                FROM hunters_hounds.bookings
                ${customerId ? `WHERE status = 'completed & paid' AND price_pounds > 0 AND owner_id = $1` : baseWhereClause}
            ),
            ytd_stats AS (
                SELECT
                    COALESCE(SUM(price_pounds), 0) as ytd_revenue,
                    COUNT(*) as ytd_bookings
                FROM hunters_hounds.bookings
                WHERE status = 'completed & paid'
                AND price_pounds > 0
                AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
                ${customerId ? `AND owner_id = $1` : ""}
            ),
            monthly_stats AS (
                SELECT
                    COALESCE(SUM(price_pounds), 0) as monthly_revenue,
                    COUNT(*) as monthly_bookings
                FROM hunters_hounds.bookings
                WHERE status = 'completed & paid'
                AND price_pounds > 0
                AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
                ${customerId ? `AND owner_id = $1` : ""}
            ),
            outstanding_stats AS (
                SELECT
                    COALESCE(SUM(price_pounds), 0) as outstanding_balance,
                    COUNT(*) as outstanding_bookings
                FROM hunters_hounds.bookings
                WHERE status = 'completed'
                AND price_pounds > 0
                ${customerId ? `AND owner_id = $1` : ""}
            )
            SELECT
                all_time_stats.all_time_revenue,
                all_time_stats.all_time_bookings,
                ytd_stats.ytd_revenue,
                ytd_stats.ytd_bookings,
                monthly_stats.monthly_revenue,
                monthly_stats.monthly_bookings,
                outstanding_stats.outstanding_balance,
                outstanding_stats.outstanding_bookings
            FROM all_time_stats, ytd_stats, monthly_stats, outstanding_stats;
        `;

        const summaryParams = customerId ? [parseInt(customerId)] : [];
        const summaryResult = await client.query(summaryQuery, summaryParams);

        // Get all available years (unfiltered, for dropdown)
        const allYearsQuery = `
            SELECT DISTINCT EXTRACT(YEAR FROM start_time)::integer as year
            FROM hunters_hounds.bookings
            WHERE status = 'completed & paid' AND price_pounds > 0
            ORDER BY year DESC;
        `;
        const allYearsResult = await client.query(allYearsQuery);

        // Revenue by year query
        const byYearQuery = `
            SELECT
                EXTRACT(YEAR FROM b.start_time)::integer as year,
                COALESCE(SUM(b.price_pounds), 0) as total_revenue,
                COUNT(*) as booking_count
            FROM hunters_hounds.bookings b
            ${whereClause}
            GROUP BY EXTRACT(YEAR FROM b.start_time)
            ORDER BY year DESC;
        `;

        const byYearResult = await client.query(byYearQuery, params);

        // Revenue by month query
        const byMonthQuery = `
            SELECT
                EXTRACT(YEAR FROM b.start_time)::integer as year,
                EXTRACT(MONTH FROM b.start_time)::integer as month,
                TO_CHAR(b.start_time, 'Month') as month_name,
                COALESCE(SUM(b.price_pounds), 0) as total_revenue,
                COUNT(*) as booking_count
            FROM hunters_hounds.bookings b
            ${whereClause}
            GROUP BY EXTRACT(YEAR FROM b.start_time), EXTRACT(MONTH FROM b.start_time), TO_CHAR(b.start_time, 'Month')
            ORDER BY year DESC, month DESC;
        `;

        const byMonthResult = await client.query(byMonthQuery, params);

        // Revenue by customer query (only when no customer filter)
        let byCustomerResult: { rows: any[] } = { rows: [] };
        if (!customerId) {
            const byCustomerQuery = `
                SELECT
                    b.owner_id,
                    o.owner_name,
                    COALESCE(SUM(b.price_pounds), 0) as total_revenue,
                    COUNT(*) as booking_count
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                WHERE b.status = 'completed & paid' AND b.price_pounds > 0
                ${year ? `AND EXTRACT(YEAR FROM b.start_time) = $1` : ""}
                ${month ? `AND EXTRACT(MONTH FROM b.start_time) = $${year ? 2 : 1}` : ""}
                GROUP BY b.owner_id, o.owner_name
                ORDER BY total_revenue DESC;
            `;

            const customerParams: any[] = [];
            if (year) customerParams.push(parseInt(year));
            if (month) customerParams.push(parseInt(month));

            byCustomerResult = await client.query(byCustomerQuery, customerParams);
        }

        // Individual bookings query (only when customer filter is applied)
        let bookingsResult: { rows: any[] } = { rows: [] };
        if (customerId) {
            const bookingsQuery = `
                SELECT
                    b.id as booking_id,
                    b.start_time,
                    b.service_type,
                    b.duration_minutes,
                    b.price_pounds,
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
                ${whereClause}
                GROUP BY b.id, b.start_time, b.service_type, b.duration_minutes, b.price_pounds
                ORDER BY b.start_time DESC;
            `;

            bookingsResult = await client.query(bookingsQuery, params);
        }

        // Transform results
        const summary = summaryResult.rows[0] || {
            all_time_revenue: 0,
            all_time_bookings: 0,
            ytd_revenue: 0,
            ytd_bookings: 0,
            monthly_revenue: 0,
            monthly_bookings: 0,
            outstanding_balance: 0,
            outstanding_bookings: 0
        };

        return NextResponse.json({
            success: true,
            summary: {
                all_time_revenue: parseFloat(summary.all_time_revenue),
                all_time_bookings: parseInt(summary.all_time_bookings),
                year_to_date_revenue: parseFloat(summary.ytd_revenue),
                year_to_date_bookings: parseInt(summary.ytd_bookings),
                monthly_revenue: parseFloat(summary.monthly_revenue),
                monthly_bookings: parseInt(summary.monthly_bookings),
                outstanding_balance: parseFloat(summary.outstanding_balance),
                outstanding_bookings: parseInt(summary.outstanding_bookings)
            },
            by_year: byYearResult.rows.map(row => ({
                year: row.year,
                total_revenue: parseFloat(row.total_revenue),
                booking_count: parseInt(row.booking_count)
            })),
            by_month: byMonthResult.rows.map(row => ({
                year: row.year,
                month: row.month,
                month_name: row.month_name.trim(),
                total_revenue: parseFloat(row.total_revenue),
                booking_count: parseInt(row.booking_count)
            })),
            by_customer: byCustomerResult.rows.map(row => ({
                owner_id: row.owner_id,
                owner_name: row.owner_name,
                total_revenue: parseFloat(row.total_revenue),
                booking_count: parseInt(row.booking_count)
            })),
            bookings: bookingsResult.rows.map(row => ({
                booking_id: row.booking_id,
                start_time: row.start_time,
                service_type: row.service_type,
                duration_minutes: row.duration_minutes,
                price_pounds: row.price_pounds ? parseFloat(row.price_pounds) : 0,
                dog_names: row.dog_names || []
            })),
            available_years: allYearsResult.rows.map(row => row.year),
            filters: {
                customer_id: customerId ? parseInt(customerId) : null,
                year: year ? parseInt(year) : null,
                month: month ? parseInt(month) : null
            }
        });

    } catch (error) {
        console.error("Revenue fetch error:", error);
        return NextResponse.json(
            { error: "Database error occurred while fetching revenue data" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
