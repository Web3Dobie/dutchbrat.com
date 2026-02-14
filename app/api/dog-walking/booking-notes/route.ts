import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';

export const dynamic = 'force-dynamic';

const pool = getPool();

// GET - Fetch notes for a customer's booking (read-only)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");
    const ownerId = searchParams.get("owner_id");

    if (!bookingId || !ownerId) {
        return NextResponse.json(
            { error: "booking_id and owner_id parameters are required" },
            { status: 400 }
        );
    }

    const bookingIdNum = parseInt(bookingId);
    const ownerIdNum = parseInt(ownerId);

    if (isNaN(bookingIdNum) || isNaN(ownerIdNum)) {
        return NextResponse.json(
            { error: "booking_id and owner_id must be valid numbers" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Fetch notes only for bookings that belong to this owner
        const result = await client.query(
            `SELECT bn.id, bn.note_text, bn.note_date, bn.created_at
             FROM hunters_hounds.booking_notes bn
             JOIN hunters_hounds.bookings b ON bn.booking_id = b.id
             WHERE bn.booking_id = $1 AND b.owner_id = $2
             ORDER BY bn.note_date ASC, bn.created_at ASC`,
            [bookingIdNum, ownerIdNum]
        );

        return NextResponse.json({
            success: true,
            notes: result.rows,
        });
    } catch (error) {
        console.error("Customer booking notes fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch booking notes" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
