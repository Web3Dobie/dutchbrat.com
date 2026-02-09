import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';

// Database Connection
const pool = getPool();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("id");

    // Validation
    if (!bookingId) {
        return NextResponse.json(
            { error: "id parameter is required" },
            { status: 400 }
        );
    }

    const bookingIdNum = parseInt(bookingId);
    if (isNaN(bookingIdNum)) {
        return NextResponse.json(
            { error: "id must be a valid number" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Fetch detailed booking information with customer and dog details
        const query = `
            SELECT
                b.id,
                b.service_type,
                b.start_time,
                b.end_time,
                b.duration_minutes,
                b.status,
                b.price_pounds,
                b.google_event_id,
                b.created_at,
                b.updated_at,
                -- Owner information
                b.owner_id,
                o.owner_name,
                o.phone as owner_phone,
                o.email as owner_email,
                o.address,
                -- Dogs information
                json_agg(
                    json_build_object(
                        'id', dogs.id,
                        'dog_name', dogs.dog_name,
                        'dog_breed', dogs.dog_breed,
                        'dog_age', dogs.dog_age
                    )
                ) FILTER (WHERE dogs.id IS NOT NULL) as dogs
            FROM hunters_hounds.bookings b
            JOIN hunters_hounds.owners o ON b.owner_id = o.id
            LEFT JOIN (
                -- Get all dogs for this booking (both dog_id_1 and dog_id_2)
                SELECT d.id, d.dog_name, d.dog_breed, d.dog_age, b2.id as booking_id
                FROM hunters_hounds.dogs d
                JOIN hunters_hounds.bookings b2 ON (d.id = b2.dog_id_1 OR d.id = b2.dog_id_2)
                WHERE b2.id = $1
            ) dogs ON dogs.booking_id = b.id
            WHERE b.id = $1
            GROUP BY
                b.id, b.service_type, b.start_time, b.end_time, b.duration_minutes,
                b.status, b.price_pounds, b.google_event_id, b.created_at, b.updated_at,
                b.owner_id, o.owner_name, o.phone, o.email, o.address;
        `;

        const result = await client.query(query, [bookingIdNum]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Booking not found" },
                { status: 404 }
            );
        }

        const row = result.rows[0];

        const booking = {
            id: row.id,
            service_type: row.service_type,
            start_time: row.start_time,
            end_time: row.end_time,
            duration_minutes: row.duration_minutes,
            status: row.status,
            price_pounds: row.price_pounds ? parseFloat(row.price_pounds) : null,
            google_event_id: row.google_event_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            owner_id: row.owner_id,
            owner_name: row.owner_name,
            owner_phone: row.owner_phone,
            owner_email: row.owner_email,
            address: row.address,
            dogs: row.dogs || []
        };

        // Fetch ALL dogs belonging to the owner (for modify dogs feature)
        const ownerDogsQuery = `
            SELECT d.id, d.dog_name, d.dog_breed, d.dog_age
            FROM hunters_hounds.dogs d
            JOIN hunters_hounds.bookings b ON b.owner_id = d.owner_id
            WHERE b.id = $1
            ORDER BY d.id;
        `;
        const ownerDogsResult = await client.query(ownerDogsQuery, [bookingIdNum]);

        return NextResponse.json({
            success: true,
            booking: booking,
            owner_dogs: ownerDogsResult.rows
        });

    } catch (error) {
        console.error("Booking details fetch error:", error);
        return NextResponse.json(
            { error: "Database error occurred while fetching booking details" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}