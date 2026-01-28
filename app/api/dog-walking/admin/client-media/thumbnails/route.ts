import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
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

const CLIENT_MEDIA_DIR = "/app/client-media";
const THUMBNAILS_DIR = path.join(CLIENT_MEDIA_DIR, "thumbnails");
const ORIGINALS_DIR = path.join(CLIENT_MEDIA_DIR, "originals");

const THUMBNAIL_SIZE = 300; // pixels

// POST - Generate thumbnails for images without them
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const client = await pool.connect();

    try {
        // Ensure thumbnails directory exists
        await fs.mkdir(THUMBNAILS_DIR, { recursive: true });

        // Get images without thumbnails
        const result = await client.query(`
            SELECT id, filename, file_path
            FROM hunters_hounds.client_media
            WHERE media_type = 'image'
            AND (thumbnail_path IS NULL OR thumbnail_path = '')
        `);

        let generated = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const row of result.rows) {
            const originalPath = path.join(CLIENT_MEDIA_DIR, row.file_path);
            const thumbFilename = `thumb_${row.filename}`;
            const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
            const thumbRelativePath = `thumbnails/${thumbFilename}`;

            try {
                // Check if original exists
                await fs.access(originalPath);

                // Generate thumbnail using sharp
                await sharp(originalPath)
                    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
                        fit: "cover",
                        position: "center"
                    })
                    .jpeg({ quality: 80 })
                    .toFile(thumbPath);

                // Update database
                await client.query(
                    "UPDATE hunters_hounds.client_media SET thumbnail_path = $1 WHERE id = $2",
                    [thumbRelativePath, row.id]
                );

                generated++;

            } catch (err: any) {
                failed++;
                errors.push(`${row.filename}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            generated,
            failed,
            total: result.rows.length,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error messages
        });

    } catch (error) {
        console.error("Failed to generate thumbnails:", error);
        return NextResponse.json(
            { error: "Failed to generate thumbnails" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
