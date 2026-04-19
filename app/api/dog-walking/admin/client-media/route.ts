import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from '@/lib/database';

// Database connection
const pool = getPool();

// GET - List media with optional filters
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get("owner_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const client = await pool.connect();

    try {
        let query = `
            SELECT
                cm.id,
                cm.owner_id,
                cm.filename,
                cm.file_path,
                cm.media_type,
                cm.file_size,
                cm.taken_at,
                cm.uploaded_at,
                cm.description,
                cm.thumbnail_path,
                o.owner_name
            FROM hunters_hounds.client_media cm
            JOIN hunters_hounds.owners o ON cm.owner_id = o.id
        `;

        const params: any[] = [];

        if (ownerId) {
            params.push(parseInt(ownerId));
            query += ` WHERE cm.owner_id = $${params.length}`;
        }

        query += ` ORDER BY cm.taken_at DESC NULLS LAST, cm.uploaded_at DESC`;
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await client.query(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) FROM hunters_hounds.client_media`;
        const countParams: any[] = [];
        if (ownerId) {
            countParams.push(parseInt(ownerId));
            countQuery += ` WHERE owner_id = $1`;
        }
        const countResult = await client.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        return NextResponse.json({
            success: true,
            media: result.rows,
            total,
            hasMore: offset + result.rows.length < total
        });

    } catch (error) {
        console.error("Failed to fetch client media:", error);
        return NextResponse.json(
            { error: "Failed to fetch media" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// POST - Assign a file to a client
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
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

    const { filename, owner_id, taken_at, description } = body;

    if (!filename || !owner_id) {
        return NextResponse.json(
            { error: "filename and owner_id are required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Check if this exact (filename, owner_id) combination already exists
        const duplicateCheck = await client.query(
            'SELECT id FROM hunters_hounds.client_media WHERE filename = $1 AND owner_id = $2',
            [filename, owner_id]
        );

        if (duplicateCheck.rows.length > 0) {
            return NextResponse.json(
                { error: "File already assigned to this client" },
                { status: 409 }
            );
        }

        // If file has prior assignments, copy shared metadata from existing row
        const priorRow = await client.query(
            `SELECT file_path, media_type, file_size, thumbnail_path
             FROM hunters_hounds.client_media WHERE filename = $1 LIMIT 1`,
            [filename]
        );
        const prior = priorRow.rows[0] ?? null;

        // Derive media type from extension if this is the first assignment
        const ext = filename.toLowerCase().split('.').pop();
        const videoExts = ['mp4', 'mov', 'avi', 'm4v'];
        const mediaType = prior?.media_type ?? (videoExts.includes(ext || '') ? 'video' : 'image');
        const filePath = prior?.file_path ?? `originals/${filename}`;
        const fileSize = prior?.file_size ?? null;
        const thumbnailPath = prior?.thumbnail_path ?? null;

        // Insert the assignment row
        const result = await client.query(
            `INSERT INTO hunters_hounds.client_media
            (owner_id, filename, file_path, media_type, file_size, thumbnail_path, taken_at, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                owner_id,
                filename,
                filePath,
                mediaType,
                fileSize,
                thumbnailPath,
                taken_at || null,
                description || null
            ]
        );

        return NextResponse.json({
            success: true,
            media: result.rows[0]
        });

    } catch (error) {
        console.error("Failed to assign media to client:", error);
        return NextResponse.json(
            { error: "Failed to assign media" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
