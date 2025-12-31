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

interface ReviewSubmitRequest {
    token: string;
    rating: number;
    review_text: string;
}

// GET - Fetch review data by token (for the review form)
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json(
            { error: "Token is required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        const query = `
            SELECT
                r.id,
                r.booking_id,
                r.rating,
                r.review_text,
                r.submitted_at,
                b.service_type,
                b.start_time,
                b.walk_summary as service_note,
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
            WHERE r.review_token = $1
        `;

        const result = await client.query(query, [token]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Review not found or invalid token" },
                { status: 404 }
            );
        }

        const row = result.rows[0];

        // Build dog names list
        const dogNames = [row.dog_name_1, row.dog_name_2].filter(name => name);

        return NextResponse.json({
            success: true,
            review: {
                id: row.id,
                bookingId: row.booking_id,
                alreadySubmitted: row.submitted_at !== null,
                existingRating: row.rating,
                existingText: row.review_text,
                serviceType: row.service_type,
                serviceDate: row.start_time,
                serviceNote: row.service_note,
                ownerName: row.owner_name,
                dogNames: dogNames,
                dogImages: [row.dog_image_1, row.dog_image_2].filter(img => img)
            }
        });

    } catch (error) {
        console.error("Error fetching review:", error);
        return NextResponse.json(
            { error: "Failed to fetch review data" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// POST - Submit the review
export async function POST(request: NextRequest) {
    let data: ReviewSubmitRequest;

    try {
        data = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    const { token, rating, review_text } = data;

    // Validation
    if (!token) {
        return NextResponse.json(
            { error: "Token is required" },
            { status: 400 }
        );
    }

    if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json(
            { error: "Rating must be between 1 and 5" },
            { status: 400 }
        );
    }

    if (!review_text || review_text.trim().length < 10) {
        return NextResponse.json(
            { error: "Please write at least a few words about your experience" },
            { status: 400 }
        );
    }

    if (review_text.length > 2000) {
        return NextResponse.json(
            { error: "Review text is too long (max 2000 characters)" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Check if review exists and hasn't been submitted yet
        const checkQuery = `
            SELECT id, submitted_at
            FROM hunters_hounds.reviews
            WHERE review_token = $1
        `;
        const checkResult = await client.query(checkQuery, [token]);

        if (checkResult.rows.length === 0) {
            return NextResponse.json(
                { error: "Invalid review token" },
                { status: 404 }
            );
        }

        if (checkResult.rows[0].submitted_at !== null) {
            return NextResponse.json(
                { error: "This review has already been submitted" },
                { status: 400 }
            );
        }

        // Update the review with rating and text
        const updateQuery = `
            UPDATE hunters_hounds.reviews
            SET rating = $1,
                review_text = $2,
                submitted_at = CURRENT_TIMESTAMP
            WHERE review_token = $3
            RETURNING id
        `;

        await client.query(updateQuery, [rating, review_text.trim(), token]);

        return NextResponse.json({
            success: true,
            message: "Thank you for your review!"
        });

    } catch (error) {
        console.error("Error submitting review:", error);
        return NextResponse.json(
            { error: "Failed to submit review" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
