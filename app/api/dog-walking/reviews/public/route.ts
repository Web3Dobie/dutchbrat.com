import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

// GET - Fetch all published reviews
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const client = await pool.connect();

    try {
        const query = `
            SELECT
                r.id,
                r.rating,
                r.review_text,
                r.submitted_at,
                r.admin_response,
                r.admin_response_date,
                b.service_type,
                b.start_time,
                b.notes as service_note,
                o.owner_name,
                COALESCE(d1.dog_name, '') as dog_name_1,
                COALESCE(d2.dog_name, '') as dog_name_2,
                COALESCE(d1.image_filename, '') as dog_image_1,
                COALESCE(d2.image_filename, '') as dog_image_2
            FROM hunters_hounds.reviews r
            JOIN hunters_hounds.bookings b ON r.booking_id = b.id
            JOIN hunters_hounds.owners o ON r.owner_id = o.id
            LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
            LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
            WHERE r.submitted_at IS NOT NULL
            ORDER BY r.submitted_at DESC
            LIMIT $1 OFFSET $2
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM hunters_hounds.reviews
            WHERE submitted_at IS NOT NULL
        `;

        const [reviewsResult, countResult] = await Promise.all([
            client.query(query, [limit, offset]),
            client.query(countQuery)
        ]);

        const reviews = reviewsResult.rows.map(row => {
            // Extract first name only for privacy
            const firstName = row.owner_name.split(' ')[0];

            // Build dog names list
            const dogNames = [row.dog_name_1, row.dog_name_2].filter(name => name);

            return {
                id: row.id,
                rating: row.rating,
                reviewText: row.review_text,
                submittedAt: row.submitted_at,
                adminResponse: row.admin_response,
                adminResponseDate: row.admin_response_date,
                serviceType: row.service_type,
                serviceDate: row.start_time,
                serviceNote: row.service_note,
                customerFirstName: firstName,
                dogNames: dogNames,
                dogImages: [row.dog_image_1, row.dog_image_2].filter(img => img)
            };
        });

        // Calculate average rating
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        return NextResponse.json({
            success: true,
            reviews,
            total: parseInt(countResult.rows[0].total),
            averageRating: Math.round(avgRating * 10) / 10
        });

    } catch (error) {
        console.error("Error fetching public reviews:", error);
        return NextResponse.json(
            { error: "Failed to fetch reviews" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
