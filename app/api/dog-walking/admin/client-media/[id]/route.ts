import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

// Database connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

// DELETE - Remove media record (does not delete file from disk)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const mediaId = parseInt(params.id);

    if (isNaN(mediaId)) {
        return NextResponse.json(
            { error: "Invalid media ID" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Check if media exists
        const existingResult = await client.query(
            "SELECT id, filename FROM hunters_hounds.client_media WHERE id = $1",
            [mediaId]
        );

        if (existingResult.rows.length === 0) {
            return NextResponse.json(
                { error: "Media not found" },
                { status: 404 }
            );
        }

        // Delete the record (file stays on disk for potential re-assignment)
        await client.query(
            "DELETE FROM hunters_hounds.client_media WHERE id = $1",
            [mediaId]
        );

        return NextResponse.json({
            success: true,
            message: "Media record deleted",
            filename: existingResult.rows[0].filename
        });

    } catch (error) {
        console.error("Failed to delete media:", error);
        return NextResponse.json(
            { error: "Failed to delete media" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// PATCH - Update media record
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const mediaId = parseInt(params.id);

    if (isNaN(mediaId)) {
        return NextResponse.json(
            { error: "Invalid media ID" },
            { status: 400 }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON" },
            { status: 400 }
        );
    }

    const { owner_id, taken_at, description } = body;

    const client = await pool.connect();

    try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (owner_id !== undefined) {
            updates.push(`owner_id = $${paramIndex++}`);
            values.push(owner_id);
        }

        if (taken_at !== undefined) {
            updates.push(`taken_at = $${paramIndex++}`);
            values.push(taken_at);
        }

        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        values.push(mediaId);

        const result = await client.query(
            `UPDATE hunters_hounds.client_media
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Media not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            media: result.rows[0]
        });

    } catch (error) {
        console.error("Failed to update media:", error);
        return NextResponse.json(
            { error: "Failed to update media" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
