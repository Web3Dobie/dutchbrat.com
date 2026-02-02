import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import ExifReader from "exifreader";
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
const ORIGINALS_DIR = path.join(CLIENT_MEDIA_DIR, "originals");
const OPTIMIZED_DIR = path.join(CLIENT_MEDIA_DIR, "optimized");
const OPTIMIZED_MARKER_DIR = path.join(CLIENT_MEDIA_DIR, ".optimized");

// Supported file extensions
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".m4v"];
const ALL_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

// Check if video has been optimized (marker file exists)
async function isVideoOptimized(filename: string): Promise<boolean> {
    try {
        await fs.access(path.join(OPTIMIZED_MARKER_DIR, `${filename}.optimized`));
        return true;
    } catch {
        return false;
    }
}

// Mark video as optimized
async function markVideoOptimized(filename: string): Promise<void> {
    await fs.mkdir(OPTIMIZED_MARKER_DIR, { recursive: true });
    await fs.writeFile(
        path.join(OPTIMIZED_MARKER_DIR, `${filename}.optimized`),
        new Date().toISOString()
    );
}

// Optimize video with faststart for streaming (moves moov atom to beginning)
// Stores optimized version in /optimized/ directory (originals are read-only)
async function optimizeVideoForStreaming(filePath: string, filename: string): Promise<boolean> {
    const tempPath = `/tmp/${filename}.temp.mp4`;
    const optimizedPath = path.join(OPTIMIZED_DIR, filename);

    try {
        // Check if already optimized
        if (await isVideoOptimized(filename)) {
            console.log(`Video already optimized: ${filename}`);
            return true;
        }

        // Ensure optimized directory exists
        await fs.mkdir(OPTIMIZED_DIR, { recursive: true });

        // Apply faststart optimization (remux only, no re-encoding)
        const command = `ffmpeg -i "${filePath}" -c copy -movflags +faststart "${tempPath}" -y`;
        console.log(`Optimizing video for streaming: ${filename}`);

        await execAsync(command);

        // Move optimized version to /optimized/ directory
        await fs.copyFile(tempPath, optimizedPath);
        await fs.unlink(tempPath);

        // Mark as optimized
        await markVideoOptimized(filename);

        console.log(`Video optimized successfully: ${filename} -> optimized/${filename}`);
        return true;
    } catch (error) {
        console.error(`Failed to optimize video ${filename}:`, error);
        // Clean up temp file if it exists
        try {
            await fs.unlink(tempPath);
        } catch {}
        return false;
    }
}

interface ScannedFile {
    filename: string;
    filePath: string;
    mediaType: "image" | "video";
    fileSize: number;
    takenAt: Date | null;
}

// Extract EXIF date from image
async function extractExifDate(filePath: string): Promise<Date | null> {
    try {
        const buffer = await fs.readFile(filePath);
        const tags = ExifReader.load(buffer.buffer) as any;

        const dateTimeOriginal = tags.DateTimeOriginal || tags.DateTime || tags.DateTimeDigitized;
        if (dateTimeOriginal && dateTimeOriginal.description) {
            // EXIF date format: "YYYY:MM:DD HH:mm:ss"
            const dateStr = dateTimeOriginal.description.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
            return new Date(dateStr);
        }
    } catch (error) {
        // EXIF extraction failed, try filename parsing
    }

    return null;
}

// Parse date from filename patterns like IMG_20230115_123456.jpg
function parseDateFromFilename(filename: string): Date | null {
    // Pattern: YYYYMMDD or YYYY-MM-DD or IMG_YYYYMMDD
    const patterns = [
        /(\d{4})(\d{2})(\d{2})_?(\d{2})?(\d{2})?(\d{2})?/,
        /(\d{4})-(\d{2})-(\d{2})/,
    ];

    for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match) {
            const [, year, month, day, hour, min, sec] = match;
            try {
                const date = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hour || "0"),
                    parseInt(min || "0"),
                    parseInt(sec || "0")
                );
                if (!isNaN(date.getTime())) {
                    return date;
                }
            } catch {
                // Continue to next pattern
            }
        }
    }

    return null;
}

// POST - Scan folder for new/unassigned files
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const client = await pool.connect();

    try {
        // Check if originals directory exists
        try {
            await fs.access(ORIGINALS_DIR);
        } catch {
            return NextResponse.json({
                success: true,
                message: "Originals directory does not exist yet",
                pending: [],
                total: 0
            });
        }

        // FIRST PASS: Optimize ALL videos in originals directory (regardless of assignment)
        const allFiles = await fs.readdir(ORIGINALS_DIR);
        let videosOptimized = 0;

        for (const filename of allFiles) {
            const ext = path.extname(filename).toLowerCase();
            if (!VIDEO_EXTENSIONS.includes(ext)) continue;

            const filePath = path.join(ORIGINALS_DIR, filename);
            try {
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) continue;

                if (!(await isVideoOptimized(filename))) {
                    const optimized = await optimizeVideoForStreaming(filePath, filename);
                    if (optimized) videosOptimized++;
                }
            } catch (err) {
                console.warn(`Could not optimize video ${filename}:`, err);
            }
        }

        // SECOND PASS: Process pending files for assignment
        // Get list of files already in database
        const existingResult = await client.query(
            "SELECT filename FROM hunters_hounds.client_media"
        );
        const existingFilenames = new Set(existingResult.rows.map(r => r.filename));

        // Scan originals directory for pending files
        const files = await fs.readdir(ORIGINALS_DIR);
        const pendingFiles: ScannedFile[] = [];

        for (const filename of files) {
            const ext = path.extname(filename).toLowerCase();

            // Skip non-media files
            if (!ALL_EXTENSIONS.includes(ext)) {
                continue;
            }

            // Skip already assigned files
            if (existingFilenames.has(filename)) {
                continue;
            }

            const filePath = path.join(ORIGINALS_DIR, filename);

            try {
                const stats = await fs.stat(filePath);

                // Skip directories
                if (stats.isDirectory()) {
                    continue;
                }

                const mediaType = VIDEO_EXTENSIONS.includes(ext) ? "video" : "image";

                // Try to extract date from EXIF (for images) or filename
                let takenAt: Date | null = null;
                if (mediaType === "image") {
                    takenAt = await extractExifDate(filePath);
                }
                if (!takenAt) {
                    takenAt = parseDateFromFilename(filename);
                }

                pendingFiles.push({
                    filename,
                    filePath: `originals/${filename}`,
                    mediaType,
                    fileSize: stats.size,
                    takenAt,
                });
            } catch (err) {
                console.warn(`Could not process file ${filename}:`, err);
            }
        }

        // Sort by date (newest first)
        pendingFiles.sort((a, b) => {
            if (a.takenAt && b.takenAt) {
                return b.takenAt.getTime() - a.takenAt.getTime();
            }
            if (a.takenAt) return -1;
            if (b.takenAt) return 1;
            return a.filename.localeCompare(b.filename);
        });

        return NextResponse.json({
            success: true,
            pending: pendingFiles,
            total: pendingFiles.length,
            videosOptimized
        });

    } catch (error) {
        console.error("Failed to scan for media:", error);
        return NextResponse.json(
            { error: "Failed to scan for media" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
