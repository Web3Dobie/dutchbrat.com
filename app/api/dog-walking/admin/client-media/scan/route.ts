import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import ExifReader from "exifreader";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from '@/lib/database';
import {
    OPTIMIZED_DIR,
    PER_FILE_TIMEOUT_MS,
    alreadyOptimised,
    hasCurrentMarker,
    markVideoOptimized,
    optimizeVideoForStreaming,
} from "@/lib/videoOptimizer";


// Database connection
const pool = getPool();

// Background optimization state — persists between requests in same process
let optimizationRunning = false;
let optimizationStats = { queued: 0, completed: 0, failed: 0 };

async function runBackgroundOptimization(videos: Array<{ filename: string; filePath: string }>) {
    optimizationRunning = true;
    optimizationStats = { queued: videos.length, completed: 0, failed: 0 };
    try {
        for (const { filename, filePath } of videos) {
            try {
                // Already fine on disk (e.g. produced by the batch script, which
                // writes no markers)? Record that and move on without encoding.
                if (await alreadyOptimised(filePath, path.join(OPTIMIZED_DIR, filename))) {
                    await markVideoOptimized(filename);
                    optimizationStats.completed++;
                    continue;
                }
                // No HTTP request is waiting on this, so each file gets the
                // full per-file ceiling rather than a slice of a request budget.
                const result = await optimizeVideoForStreaming(filePath, filename, PER_FILE_TIMEOUT_MS);
                if (result.success) optimizationStats.completed++;
                else optimizationStats.failed++;
            } catch (error) {
                console.error(`Background optimisation failed for ${filename}:`, error);
                optimizationStats.failed++;
            }
        }
    } finally {
        // Always release the flag, or one bad file would block every later scan
        // from starting a pass until the container restarted.
        optimizationRunning = false;
    }
}

const CLIENT_MEDIA_DIR = "/app/client-media";
const ORIGINALS_DIR = path.join(CLIENT_MEDIA_DIR, "originals");

// Supported file extensions
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".m4v"];
const ALL_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

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

        // FIRST PASS: Collect unoptimized videos and start background optimization
        const allFiles = await fs.readdir(ORIGINALS_DIR);
        const unoptimizedVideos: Array<{ filename: string; filePath: string }> = [];

        for (const filename of allFiles) {
            const ext = path.extname(filename).toLowerCase();
            if (!VIDEO_EXTENSIONS.includes(ext)) continue;

            const filePath = path.join(ORIGINALS_DIR, filename);
            try {
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) continue;
                if (!(await hasCurrentMarker(filename))) {
                    unoptimizedVideos.push({ filename, filePath });
                }
            } catch (err) {
                console.warn(`Could not check video ${filename}:`, err);
            }
        }

        // Fire optimization in background — does not block the response
        if (unoptimizedVideos.length > 0 && !optimizationRunning) {
            runBackgroundOptimization(unoptimizedVideos).catch(err =>
                console.error('Background video optimization error:', err)
            );
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
            optimizationInProgress: optimizationRunning,
            videosQueued: optimizationStats.queued,
            videosOptimized: optimizationStats.completed,
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
