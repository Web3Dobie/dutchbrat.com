import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { exec } from "child_process";
import { promisify } from "util";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const execAsync = promisify(exec);

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
const TEMP_DIR = path.join(THUMBNAILS_DIR, "temp");

const THUMBNAIL_SIZE = 300; // pixels

// Check if FFmpeg is available
async function isFFmpegAvailable(): Promise<boolean> {
    try {
        await execAsync("ffmpeg -version");
        return true;
    } catch {
        return false;
    }
}

// Get video duration in seconds
async function getVideoDuration(videoPath: string): Promise<number> {
    try {
        const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`;
        const { stdout } = await execAsync(command);
        const duration = parseFloat(stdout.trim());
        return isNaN(duration) ? 10 : duration;
    } catch {
        return 10; // Default fallback
    }
}

// Extract frame from video and create thumbnail
async function generateVideoThumbnail(
    videoPath: string,
    thumbPath: string,
    filename: string
): Promise<void> {
    // Create temp directory
    await fs.mkdir(TEMP_DIR, { recursive: true });

    const baseName = path.parse(filename).name;
    const tempFramePath = path.join(TEMP_DIR, `${baseName}_temp.jpg`);

    try {
        // Get video duration and extract frame at 1 second or 10% in
        const duration = await getVideoDuration(videoPath);
        const extractTime = Math.min(1, duration * 0.1);

        // Extract frame using FFmpeg
        const extractCommand = `ffmpeg -i "${videoPath}" -ss ${extractTime} -vframes 1 -q:v 2 "${tempFramePath}" -y`;
        console.log(`Extracting frame from video: ${filename} at ${extractTime}s`);
        await execAsync(extractCommand);

        // Check if frame was extracted
        await fs.access(tempFramePath);

        // Resize the extracted frame using Sharp
        await sharp(tempFramePath)
            .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
                fit: "cover",
                position: "center"
            })
            .jpeg({ quality: 80 })
            .toFile(thumbPath);

        console.log(`Generated video thumbnail for: ${filename}`);
    } finally {
        // Clean up temp frame
        try {
            await fs.unlink(tempFramePath);
        } catch {
            // Ignore cleanup errors
        }
    }
}

// POST - Generate thumbnails for images and videos without them
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const client = await pool.connect();

    try {
        // Ensure thumbnails directory exists
        await fs.mkdir(THUMBNAILS_DIR, { recursive: true });

        // Check FFmpeg availability for videos
        const ffmpegAvailable = await isFFmpegAvailable();
        console.log(`FFmpeg available: ${ffmpegAvailable}`);

        // Get all media without thumbnails (images and videos)
        const result = await client.query(`
            SELECT id, filename, file_path, media_type
            FROM hunters_hounds.client_media
            WHERE (thumbnail_path IS NULL OR thumbnail_path = '')
        `);

        let generated = 0;
        let failed = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const row of result.rows) {
            const originalPath = path.join(CLIENT_MEDIA_DIR, row.file_path);
            const thumbFilename = `thumb_${path.parse(row.filename).name}.jpg`;
            const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
            const thumbRelativePath = `thumbnails/${thumbFilename}`;

            try {
                // Check if original exists
                await fs.access(originalPath);

                if (row.media_type === "image") {
                    // Generate image thumbnail using Sharp
                    await sharp(originalPath)
                        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
                            fit: "cover",
                            position: "center"
                        })
                        .jpeg({ quality: 80 })
                        .toFile(thumbPath);

                    console.log(`Generated image thumbnail for: ${row.filename}`);

                } else if (row.media_type === "video") {
                    // Generate video thumbnail using FFmpeg + Sharp
                    if (!ffmpegAvailable) {
                        skipped++;
                        errors.push(`${row.filename}: FFmpeg not available`);
                        continue;
                    }

                    await generateVideoThumbnail(originalPath, thumbPath, row.filename);

                } else {
                    skipped++;
                    continue;
                }

                // Update database
                await client.query(
                    "UPDATE hunters_hounds.client_media SET thumbnail_path = $1 WHERE id = $2",
                    [thumbRelativePath, row.id]
                );

                generated++;

            } catch (err: any) {
                failed++;
                const errorMsg = `${row.filename}: ${err.message}`;
                errors.push(errorMsg);
                console.error("Thumbnail generation failed:", errorMsg, err);
            }
        }

        return NextResponse.json({
            success: true,
            generated,
            failed,
            skipped,
            total: result.rows.length,
            ffmpegAvailable,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined
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
