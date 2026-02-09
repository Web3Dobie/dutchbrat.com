import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from '@/lib/database';

const execAsync = promisify(exec);

// Database connection
const pool = getPool();

const CLIENT_MEDIA_DIR = "/app/client-media";
const ORIGINALS_DIR = path.join(CLIENT_MEDIA_DIR, "originals");
const OPTIMIZED_DIR = path.join(CLIENT_MEDIA_DIR, "optimized");
const OPTIMIZED_MARKER_DIR = path.join(CLIENT_MEDIA_DIR, ".optimized");

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
async function optimizeVideoForStreaming(filePath: string, filename: string): Promise<{ success: boolean; error?: string }> {
    const tempPath = `/tmp/${filename}.temp.mp4`;
    const optimizedPath = path.join(OPTIMIZED_DIR, filename);

    try {
        // Check if file exists
        await fs.access(filePath);

        // Ensure optimized directory exists
        await fs.mkdir(OPTIMIZED_DIR, { recursive: true });

        // Apply faststart optimization (remux only, no re-encoding)
        const command = `ffmpeg -i "${filePath}" -c copy -movflags +faststart "${tempPath}" -y`;
        console.log(`Re-optimizing video for streaming: ${filename}`);

        await execAsync(command);

        // Move optimized version to /optimized/ directory
        await fs.copyFile(tempPath, optimizedPath);
        await fs.unlink(tempPath);

        // Mark as optimized
        await markVideoOptimized(filename);

        console.log(`Video re-optimized successfully: ${filename} -> optimized/${filename}`);
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to re-optimize video ${filename}:`, error);
        // Clean up temp file if it exists
        try {
            await fs.unlink(tempPath);
        } catch {}
        return { success: false, error: error.message };
    }
}

// POST - Re-optimize all videos that haven't been optimized yet
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const client = await pool.connect();

    try {
        // Get all video files from the database
        const result = await client.query(`
            SELECT id, filename, file_path
            FROM hunters_hounds.client_media
            WHERE media_type = 'video'
        `);

        let optimized = 0;
        let alreadyOptimized = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const row of result.rows) {
            const filePath = path.join(CLIENT_MEDIA_DIR, row.file_path);

            // Check if already optimized
            if (await isVideoOptimized(row.filename)) {
                alreadyOptimized++;
                continue;
            }

            // Try to optimize
            const result = await optimizeVideoForStreaming(filePath, row.filename);
            if (result.success) {
                optimized++;
            } else {
                failed++;
                errors.push(`${row.filename}: ${result.error}`);
            }
        }

        return NextResponse.json({
            success: true,
            total: result.rows.length,
            optimized,
            alreadyOptimized,
            failed,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined
        });

    } catch (error) {
        console.error("Failed to re-optimize videos:", error);
        return NextResponse.json(
            { error: "Failed to re-optimize videos" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// DELETE - Clear all optimization markers (force re-optimization on next call)
export async function DELETE(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        // Check if marker directory exists
        try {
            await fs.access(OPTIMIZED_MARKER_DIR);
        } catch {
            return NextResponse.json({
                success: true,
                message: "No optimization markers to clear",
                cleared: 0
            });
        }

        // Remove all marker files
        const files = await fs.readdir(OPTIMIZED_MARKER_DIR);
        let cleared = 0;

        for (const file of files) {
            if (file.endsWith('.optimized')) {
                await fs.unlink(path.join(OPTIMIZED_MARKER_DIR, file));
                cleared++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cleared ${cleared} optimization markers`,
            cleared
        });

    } catch (error) {
        console.error("Failed to clear optimization markers:", error);
        return NextResponse.json(
            { error: "Failed to clear optimization markers" },
            { status: 500 }
        );
    }
}
