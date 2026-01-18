import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

// GET - List reviews or eligible bookings for admin
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get("section") || "submitted"; // submitted, eligible
    const filter = searchParams.get("filter") || "all"; // all, pending, responded (only for submitted)
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const client = await pool.connect();

    try {
        // Handle "eligible" section - bookings that can receive review requests
        if (section === "eligible") {
            const eligibleQuery = `
                SELECT
                    b.id as booking_id,
                    b.service_type,
                    b.start_time,
                    b.walk_summary,
                    o.id as owner_id,
                    o.owner_name,
                    o.email as owner_email,
                    COALESCE(d1.dog_name, '') as dog_name_1,
                    COALESCE(d2.dog_name, '') as dog_name_2,
                    COALESCE(d1.image_filename, '') as dog_image_1,
                    COALESCE(d2.image_filename, '') as dog_image_2
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                LEFT JOIN hunters_hounds.reviews r ON b.id = r.booking_id
                WHERE b.status = 'completed & paid' AND r.id IS NULL
                ORDER BY b.start_time DESC
                LIMIT $1 OFFSET $2
            `;

            const eligibleCountQuery = `
                SELECT COUNT(*) as total
                FROM hunters_hounds.bookings b
                LEFT JOIN hunters_hounds.reviews r ON b.id = r.booking_id
                WHERE b.status = 'completed & paid' AND r.id IS NULL
            `;

            const [eligibleResult, countResult] = await Promise.all([
                client.query(eligibleQuery, [limit, offset]),
                client.query(eligibleCountQuery)
            ]);

            const eligibleBookings = eligibleResult.rows.map(row => ({
                bookingId: row.booking_id,
                serviceType: row.service_type,
                serviceDate: row.start_time,
                walkSummary: row.walk_summary,
                ownerId: row.owner_id,
                ownerName: row.owner_name,
                ownerEmail: row.owner_email,
                dogNames: [row.dog_name_1, row.dog_name_2].filter(n => n),
                dogImages: [row.dog_image_1, row.dog_image_2].filter(img => img)
            }));

            return NextResponse.json({
                success: true,
                eligibleBookings,
                total: parseInt(countResult.rows[0].total)
            });
        }

        // Default: Handle "submitted" section - existing behavior
        let whereClause = "WHERE r.submitted_at IS NOT NULL";

        if (filter === "pending") {
            whereClause += " AND r.admin_response IS NULL";
        } else if (filter === "responded") {
            whereClause += " AND r.admin_response IS NOT NULL";
        }

        const query = `
            SELECT
                r.id,
                r.booking_id,
                r.rating,
                r.review_text,
                r.submitted_at,
                r.admin_response,
                r.admin_response_date,
                b.service_type,
                b.start_time,
                b.walk_summary as service_note,
                o.owner_name,
                o.email as owner_email,
                COALESCE(d1.dog_name, '') as dog_name_1,
                COALESCE(d2.dog_name, '') as dog_name_2
            FROM hunters_hounds.reviews r
            JOIN hunters_hounds.bookings b ON r.booking_id = b.id
            JOIN hunters_hounds.owners o ON r.owner_id = o.id
            LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
            LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
            ${whereClause}
            ORDER BY r.submitted_at DESC
            LIMIT $1 OFFSET $2
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM hunters_hounds.reviews r
            ${whereClause}
        `;

        const [reviewsResult, countResult] = await Promise.all([
            client.query(query, [limit, offset]),
            client.query(countQuery)
        ]);

        const reviews = reviewsResult.rows.map(row => ({
            id: row.id,
            bookingId: row.booking_id,
            rating: row.rating,
            reviewText: row.review_text,
            submittedAt: row.submitted_at,
            adminResponse: row.admin_response,
            adminResponseDate: row.admin_response_date,
            serviceType: row.service_type,
            serviceDate: row.start_time,
            serviceNote: row.service_note,
            ownerName: row.owner_name,
            ownerEmail: row.owner_email,
            dogNames: [row.dog_name_1, row.dog_name_2].filter(n => n)
        }));

        return NextResponse.json({
            success: true,
            reviews,
            total: parseInt(countResult.rows[0].total)
        });

    } catch (error) {
        console.error("Error fetching admin reviews:", error);
        return NextResponse.json(
            { error: "Failed to fetch reviews" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// PUT - Add or update admin response to a review
export async function PUT(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    let data: { review_id: number; admin_response: string };

    try {
        data = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    const { review_id, admin_response } = data;

    if (!review_id) {
        return NextResponse.json(
            { error: "review_id is required" },
            { status: 400 }
        );
    }

    if (!admin_response || admin_response.trim().length === 0) {
        return NextResponse.json(
            { error: "admin_response is required" },
            { status: 400 }
        );
    }

    if (admin_response.length > 1000) {
        return NextResponse.json(
            { error: "Response is too long (max 1000 characters)" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        const updateQuery = `
            UPDATE hunters_hounds.reviews
            SET admin_response = $1,
                admin_response_date = CURRENT_TIMESTAMP
            WHERE id = $2 AND submitted_at IS NOT NULL
            RETURNING id, admin_response, admin_response_date
        `;

        const result = await client.query(updateQuery, [admin_response.trim(), review_id]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Review not found or not yet submitted" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Response added successfully",
            review: result.rows[0]
        });

    } catch (error) {
        console.error("Error updating admin response:", error);
        return NextResponse.json(
            { error: "Failed to update response" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// DELETE - Remove admin response from a review
export async function DELETE(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const reviewId = searchParams.get("review_id");

    if (!reviewId) {
        return NextResponse.json(
            { error: "review_id is required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        const updateQuery = `
            UPDATE hunters_hounds.reviews
            SET admin_response = NULL,
                admin_response_date = NULL
            WHERE id = $1
            RETURNING id
        `;

        const result = await client.query(updateQuery, [reviewId]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Review not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Response removed successfully"
        });

    } catch (error) {
        console.error("Error removing admin response:", error);
        return NextResponse.json(
            { error: "Failed to remove response" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
