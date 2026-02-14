import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { sendTelegramNotification } from "@/lib/telegram";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = getPool();

// GET - Fetch all notes for a booking
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");

    if (!bookingId) {
        return NextResponse.json(
            { error: "booking_id parameter is required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT id, booking_id, note_text, note_date, created_at, updated_at
             FROM hunters_hounds.booking_notes
             WHERE booking_id = $1
             ORDER BY note_date ASC, created_at ASC`,
            [parseInt(bookingId)]
        );

        return NextResponse.json({
            success: true,
            notes: result.rows,
        });
    } catch (error) {
        console.error("Fetch booking notes error:", error);
        return NextResponse.json(
            { error: "Failed to fetch booking notes" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data = await request.json();
        const { booking_id, note_text, note_date } = data;

        if (!booking_id || !note_text || typeof note_text !== 'string' || !note_text.trim()) {
            return NextResponse.json(
                { error: "booking_id and non-empty note_text are required" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            // Validate booking exists, is confirmed, and is multi-day
            const bookingResult = await client.query(
                `SELECT b.id, b.status, b.booking_type, b.start_time, b.end_time,
                        o.owner_name,
                        ARRAY_REMOVE(ARRAY[d1.dog_name, d2.dog_name], NULL) as dog_names
                 FROM hunters_hounds.bookings b
                 JOIN hunters_hounds.owners o ON b.owner_id = o.id
                 LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                 LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                 WHERE b.id = $1`,
                [booking_id]
            );

            if (bookingResult.rows.length === 0) {
                return NextResponse.json(
                    { error: "Booking not found" },
                    { status: 404 }
                );
            }

            const booking = bookingResult.rows[0];

            if (booking.status !== 'confirmed') {
                return NextResponse.json(
                    { error: `Cannot add notes to booking in '${booking.status}' status. Booking must be confirmed.` },
                    { status: 400 }
                );
            }

            if (booking.booking_type !== 'multi_day') {
                return NextResponse.json(
                    { error: "Ad-hoc notes are only available for multi-day sitting bookings" },
                    { status: 400 }
                );
            }

            // Insert the note
            const insertResult = await client.query(
                `INSERT INTO hunters_hounds.booking_notes (booking_id, note_text, note_date)
                 VALUES ($1, $2, $3)
                 RETURNING id, booking_id, note_text, note_date, created_at`,
                [booking_id, note_text.trim(), note_date || new Date().toISOString().split('T')[0]]
            );

            const newNote = insertResult.rows[0];

            // Count total notes for this booking for the Telegram message
            const countResult = await client.query(
                `SELECT COUNT(*) as total FROM hunters_hounds.booking_notes WHERE booking_id = $1`,
                [booking_id]
            );
            const totalNotes = parseInt(countResult.rows[0].total);

            // Send Telegram notification
            try {
                const dogNames = booking.dog_names.join(', ');
                const noteDateStr = new Date(newNote.note_date).toLocaleDateString('en-GB', {
                    weekday: 'short', day: 'numeric', month: 'short'
                });

                const telegramMessage = `
📝 <b>SITTING NOTE ADDED</b> 📝

<b>Booking #${booking.id}:</b> ${booking.owner_name} - ${dogNames}
<b>Note ${totalNotes} (${noteDateStr}):</b>
${note_text.trim()}

<i>Note visible to client in their dashboard</i>
                `.trim();

                await sendTelegramNotification(telegramMessage);
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
            }

            return NextResponse.json({
                success: true,
                note: newNote,
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Create booking note error:", error);
        return NextResponse.json(
            { error: "Failed to create booking note" },
            { status: 500 }
        );
    }
}

// PUT - Update an existing note
export async function PUT(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data = await request.json();
        const { note_id, note_text } = data;

        if (!note_id || !note_text || typeof note_text !== 'string' || !note_text.trim()) {
            return NextResponse.json(
                { error: "note_id and non-empty note_text are required" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            const result = await client.query(
                `UPDATE hunters_hounds.booking_notes
                 SET note_text = $2, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1
                 RETURNING id, booking_id, note_text, note_date, created_at, updated_at`,
                [note_id, note_text.trim()]
            );

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { error: "Note not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                note: result.rows[0],
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Update booking note error:", error);
        return NextResponse.json(
            { error: "Failed to update booking note" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a note
export async function DELETE(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const data = await request.json();
        const { note_id } = data;

        if (!note_id) {
            return NextResponse.json(
                { error: "note_id is required" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            const result = await client.query(
                `DELETE FROM hunters_hounds.booking_notes WHERE id = $1 RETURNING id`,
                [note_id]
            );

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { error: "Note not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                message: "Note deleted",
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Delete booking note error:", error);
        return NextResponse.json(
            { error: "Failed to delete booking note" },
            { status: 500 }
        );
    }
}
