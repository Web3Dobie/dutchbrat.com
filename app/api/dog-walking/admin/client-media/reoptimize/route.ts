import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from '@/lib/database';
import {
    CLIENT_MEDIA_DIR,
    OPTIMIZED_MARKER_DIR,
    ORIGINALS_DIR,
    OPTIMIZED_DIR,
    alreadyOptimised,
    hasCurrentMarker,
    markVideoOptimized,
    optimizeVideoForStreaming,
} from "@/lib/videoOptimizer";

/**
 * Only one run at a time, per process.
 *
 * Two concurrent runs are pure waste -- both walk the whole library to the same
 * conclusion -- and on files that genuinely need encoding they are dangerous:
 * two ffmpeg processes writing one output path, then both renaming it into the
 * served directory. Unique temp names make that safe, and this makes it moot.
 *
 * A client that gives up and presses again is the normal way in, so the second
 * caller gets a quick, explicit answer instead of starting a rival pass.
 */
let runInProgress = false;

// Database connection
const pool = getPool();

// An HTTP request cannot transcode 858 videos. Real encoding runs at roughly
// one second of CPU per second of video, where the old `-c copy` remux was
// near-instant, so each call now does a small bounded batch and reports what is
// left. The admin button is pressed until `remaining` reaches 0, and the marker
// files make that resumable.
//
// The ceiling is not arbitrary: this route sits under `location /` in
// nginx-proxy.conf, which has `proxy_read_timeout 120s`. Overrun that and the
// client gets a 504 while the work carries on invisibly. So the handler keeps
// itself inside a budget comfortably under 120s, and no single ffmpeg call is
// allowed to outlive the budget that is left.
//
// For bulk work use scripts/reencode-client-media.sh instead, which has no
// timeout to answer to. This endpoint is for the handful of clips uploaded
// since the last run.
const DEFAULT_LIMIT = 3;
// 45s, not 75s: the browser abandoned a 44.9s request on 2026-11-19. Cloudflare
// also gives up around 100s and this route's nginx location at 120s, so staying
// well under all three matters more than squeezing in another file per press.
const DEFAULT_BUDGET_MS = 45_000;
// Don't start a file unless there is a sensible slice of budget left for it.
const MIN_SLICE_MS = 20_000;
// Keep a little budget back so the inspection pass itself cannot overrun.
// One probe is ~67ms, so this leaves room for a good many files and still
// returns well inside the proxy timeout.
const PROBE_RESERVE_MS = 5_000;

// POST - Re-optimise videos that are not yet in a playable, streamable format.
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    let limit = DEFAULT_LIMIT;
    let budgetMs = DEFAULT_BUDGET_MS;
    try {
        const body = await request.json();
        if (Number.isFinite(body?.limit) && body.limit > 0) limit = Math.min(body.limit, 500);
        if (Number.isFinite(body?.budgetMs) && body.budgetMs > 0) budgetMs = Math.min(body.budgetMs, 600_000);
    } catch {
        // No body is the normal case from the admin button.
    }

    if (runInProgress) {
        return NextResponse.json({
            success: true,
            alreadyRunning: true,
            message: "A re-optimisation pass is already running. Give it a moment and press again.",
            optimized: 0,
            alreadyOptimized: 0,
            failed: 0,
            remaining: 0,
        });
    }
    runInProgress = true;

    const startedAt = Date.now();
    const client = await pool.connect();

    try {
        // DISTINCT: a video of two dogs with different owners has one row per
        // owner, so client_media holds 953 video rows for 858 files. The marker
        // stops duplicates being encoded twice either way, but without this the
        // totals reported back count the same file more than once.
        const result = await client.query(`
            SELECT DISTINCT filename, file_path
            FROM hunters_hounds.client_media
            WHERE media_type = 'video'
            ORDER BY filename
        `);

        let optimized = 0;
        let alreadyOptimized = 0;
        let failed = 0;
        let remaining = 0;
        let remuxed = 0;
        let transcoded = 0;
        let bytesBefore = 0;
        let bytesAfter = 0;
        const errors: string[] = [];

        for (const row of result.rows) {
          // One awkward file must never abort the batch. On 2026-11-19 an
          // EACCES on a single marker threw out of this loop and failed the
          // whole request after 53 files had been processed successfully.
          try {
            const filePath = path.join(CLIENT_MEDIA_DIR, row.file_path);

            // file_path comes from the scanner, but keep it inside the media
            // tree regardless -- a crafted value must not reach the filesystem.
            const resolved = path.resolve(filePath);
            if (!resolved.startsWith(ORIGINALS_DIR + path.sep) && !resolved.startsWith(OPTIMIZED_DIR + path.sep)) {
                failed++;
                errors.push(`${row.filename}: path outside the media tree`);
                continue;
            }

            const optimizedPath = path.join(OPTIMIZED_DIR, row.filename);

            // Fast path: a marker this version wrote. Costs one small read, so
            // it runs for every row regardless of budget.
            if (await hasCurrentMarker(row.filename)) {
                alreadyOptimized++;
                continue;
            }

            let msLeft = budgetMs - (Date.now() - startedAt);

            // Slow path: look at the real file. Needed both for the stale
            // `-c copy` markers and because the batch script writes none.
            //
            // This is gated on the budget too, which is not over-caution: a
            // probe measured 67ms against the live library, so checking all 858
            // files is 58 seconds of the 75s budget before any encoding starts.
            // Ungated, the first run after a deploy would risk the 504 this
            // budget exists to avoid. Whatever does not fit is simply counted
            // and picked up on the next press, and each file checked here gets
            // a marker, so repeated presses converge quickly.
            if (msLeft < PROBE_RESERVE_MS) {
                remaining++;
                continue;
            }
            if (await alreadyOptimised(resolved, optimizedPath)) {
                await markVideoOptimized(row.filename);
                alreadyOptimized++;
                continue;
            }

            // Out of batch, or not enough time left to give this file a fair
            // run: count the rest and leave them for the next press rather than
            // risk nginx returning a 504 mid-transcode.
            msLeft = budgetMs - (Date.now() - startedAt);
            if (optimized + failed >= limit || msLeft < MIN_SLICE_MS) {
                remaining++;
                continue;
            }

            const outcome = await optimizeVideoForStreaming(resolved, row.filename, msLeft);
            if (outcome.success) {
                optimized++;
                if (outcome.action === "remux") remuxed++;
                else transcoded++;
                bytesBefore += outcome.bytesBefore ?? 0;
                bytesAfter += outcome.bytesAfter ?? 0;
            } else if (outcome.deferred) {
                remaining++;
            } else {
                failed++;
                errors.push(`${row.filename}: ${outcome.error}`);
            }
          } catch (error: any) {
            failed++;
            errors.push(`${row.filename}: ${error?.code || error?.message || "unexpected error"}`);
            console.error(`Unexpected error on ${row.filename}:`, error);
          }
        }

        return NextResponse.json({
            success: true,
            total: result.rows.length,
            optimized,
            alreadyOptimized,
            failed,
            remaining,
            remuxed,
            transcoded,
            bytesBefore,
            bytesAfter,
            elapsedMs: Date.now() - startedAt,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        });
    } catch (error) {
        console.error("Failed to re-optimise videos:", error);
        return NextResponse.json(
            { error: "Failed to re-optimise videos" },
            { status: 500 }
        );
    } finally {
        client.release();
        runInProgress = false;
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
