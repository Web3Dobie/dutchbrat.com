// lib/videoOptimizer.ts
//
// The one place that turns an uploaded video into the copy clients stream.
// Shared by the admin "Re-optimize videos" button and the background pass that
// Scan kicks off, so the two can never disagree about what "optimised" means.
// (Until 2026-11-19 Scan had its own copy of the old `-c copy` remux and kept
// producing full-size, possibly unplayable files after the button was fixed.)
import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { randomBytes } from "crypto";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * A temp-file suffix that cannot collide.
 *
 * pid+timestamp is not enough. On 2026-11-19 a request abandoned by the browser
 * (nginx logged 499) kept running server-side while the next press started, so
 * two loops in the SAME process produced identical `pid.millisecond` names; one
 * renamed the temp file and the other's rename failed ENOENT, 141 times.
 */
function tempSuffix(): string {
    return `${process.pid}.${Date.now()}.${randomBytes(6).toString("hex")}`;
}

export const CLIENT_MEDIA_DIR = "/app/client-media";
export const ORIGINALS_DIR = path.join(CLIENT_MEDIA_DIR, "originals");
export const OPTIMIZED_DIR = path.join(CLIENT_MEDIA_DIR, "optimized");
export const OPTIMIZED_MARKER_DIR = path.join(CLIENT_MEDIA_DIR, ".optimized");

// Marker files assert "this video is optimised". Until 2026-11-19 they were
// written by a version of this route that only remuxed the container, so the
// 858 markers already on disk (written between 29 Jan and 10 Sep 2026) assert
// something that was never true: the video stream was left untouched.
//
// So markers carry a version. Anything without the current prefix is treated as
// absent, which makes the fix self-healing -- the first run after a deploy pays
// the cost of checking the real files and rewrites the markers it trusts. Bump
// this whenever a change means an older marker can no longer be believed.
const MARKER_VERSION = "v2";

// Encode target. Matches scripts/reencode-client-media.sh so a file produced
// here is indistinguishable from one the overnight batch produced.
const TARGET_BITRATE = "4M";
const TARGET_BPS = 4_000_000;
const MAXRATE = "5M";
const BUFSIZE = "8M";
const PRESET = "medium";

// Absolute ceiling for one file, whatever the budget says.
export const PER_FILE_TIMEOUT_MS = 10 * 60_000;

// HDR10 (PQ) and HLG must be tonemapped down to SDR. Without this an SDR
// player shows washed-out grey video, which looks broken rather than merely
// different -- worse than leaving the file alone.
const HDR_CHAIN =
    "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709," +
    "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p";
const SDR_CHAIN = "format=yuv420p";

// NOTE: -of default=nokey=1:noprint_wrappers=1, NOT csv=p=0.
//
// csv=p=0 returns every value with a TRAILING COMMA ("smpte2084,"), which
// silently broke HDR detection in the batch script on 2026-11-18: the match
// fell through to the SDR branch, so each HDR file would have been converted
// without tonemapping and come out washed out, with no error anywhere.
async function probe(entries: string, file: string): Promise<string> {
    try {
        const { stdout } = await execFileAsync(
            "ffprobe",
            [
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", entries,
                "-of", "default=nokey=1:noprint_wrappers=1",
                file,
            ],
            { timeout: 30_000, maxBuffer: 1 << 20 }
        );
        return stdout.split("\n")[0].trim();
    } catch {
        return "";
    }
}

/**
 * Several stream fields in ONE ffprobe call, parsed by key.
 *
 * Keys are kept (no nokey=1) so fields are matched by name rather than by the
 * order ffprobe happens to emit them in. This matters for cost, not elegance:
 * checking the real state of every video is two probes per file if codec and
 * pixel format are fetched separately, and at ~40ms a probe that is 70s across
 * the library -- most of the request budget spent before any encoding starts.
 */
async function probeFields(entries: string, file: string): Promise<Record<string, string>> {
    try {
        const { stdout } = await execFileAsync(
            "ffprobe",
            [
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", entries,
                "-of", "default=noprint_wrappers=1",
                file,
            ],
            { timeout: 30_000, maxBuffer: 1 << 20 }
        );
        const out: Record<string, string> = {};
        for (const line of stdout.split("\n")) {
            const eq = line.indexOf("=");
            if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
        }
        return out;
    } catch {
        return {};
    }
}

/** h264, 8-bit: the format every client device can actually play. */
async function isPhoneSafe(file: string): Promise<boolean> {
    const f = await probeFields("stream=codec_name,pix_fmt", file);
    return f.codec_name === "h264" && f.pix_fmt === "yuv420p";
}

async function durationOf(file: string): Promise<number> {
    return parseFloat(await probe("format=duration", file)) || 0;
}

async function sizeOf(file: string): Promise<number> {
    try {
        return (await fs.stat(file)).size;
    } catch {
        return 0;
    }
}

/**
 * Record that a file is done. Best effort, and deliberately unable to fail the
 * request: the marker is a cache, and the file on disk is the real evidence.
 *
 * Written via a temp file and rename rather than straight over the target.
 * Overwriting in place needs write permission on the FILE, and the marker
 * directory is a mix of owners -- 850 belong to the container's user and 8 to
 * the host user from an early 2026 run. Those 8 are mode 664, so the container
 * falls into "other" and gets read-only. On 2026-11-19 that raised EACCES
 * partway through the directory and took the whole request down with it.
 * Rename only needs write permission on the DIRECTORY, which is 777, so this
 * works whoever happens to own the existing file.
 */
export async function markVideoOptimized(filename: string): Promise<void> {
    const target = path.join(OPTIMIZED_MARKER_DIR, `${filename}.optimized`);
    const tmp = `${target}.tmp.${tempSuffix()}`;
    try {
        await fs.mkdir(OPTIMIZED_MARKER_DIR, { recursive: true });
        await fs.writeFile(tmp, `${MARKER_VERSION}:${new Date().toISOString()}`);
        await fs.rename(tmp, target);
    } catch (error: any) {
        await fs.rm(tmp, { force: true }).catch(() => {});
        // Not fatal. Without a marker this file is simply re-checked next time,
        // which costs one probe and reaches the same conclusion.
        console.warn(`Could not write marker for ${filename}: ${error?.code || error?.message}`);
    }
}

/**
 * A marker we can believe: present AND written by this version of the route.
 *
 * Reading the contents rather than just testing for the file is the whole
 * point. The markers on disk from the old `-c copy` route look identical to a
 * real one from the outside, and trusting them would skip every video forever.
 */
export async function hasCurrentMarker(filename: string): Promise<boolean> {
    try {
        const body = await fs.readFile(
            path.join(OPTIMIZED_MARKER_DIR, `${filename}.optimized`),
            "utf-8"
        );
        return body.startsWith(`${MARKER_VERSION}:`);
    } catch {
        return false;
    }
}

/**
 * Is this file genuinely done, judged on the file itself rather than a marker?
 *
 * The marker alone is not enough. The overnight batch script writes no markers,
 * so after it ran, all 858 videos looked un-optimised to this endpoint and
 * pressing the button would have re-transcoded every one of them. Checking the
 * real file state makes the two agree, and makes a redundant press a cheap
 * no-op that just backfills the marker.
 */
export async function alreadyOptimised(src: string, dst: string): Promise<boolean> {
    const dstSize = await sizeOf(dst);
    if (dstSize === 0) return false;
    if (!(await isPhoneSafe(dst))) return false;
    // <=, not <: where the source was already small and playable we publish a
    // faststart remux of the same picture, so the sizes come out near-identical.
    return dstSize <= (await sizeOf(src)) * 1.02;
}

export type Action = "remux" | "transcode";

/**
 * Re-optimise one video into optimized/.
 *
 * Two paths, and picking the wrong one is how this endpoint got it wrong before:
 *
 *  - `remux`: the source is already h264 8-bit at or under our bitrate target,
 *    so the picture needs nothing. We still rewrite the container to move the
 *    moov atom to the front (+faststart), which is what makes the clip start
 *    playing before it has fully downloaded. Re-encoding these is actively
 *    harmful: 26 WhatsApp-forwarded clips came out 2.5x LARGER on 2026-11-18,
 *    and dropping Baseline to the High profile made them less compatible, not
 *    more.
 *
 *  - `transcode`: anything else -- HEVC, 10-bit, HDR, or simply far above the
 *    target bitrate. This is the case the old `-c copy` silently skipped: it
 *    moved the moov atom and declared the file optimised while leaving 30 Mbps
 *    HEVC 10-bit HDR video in place, which many clients could not play at all.
 */
export async function optimizeVideoForStreaming(
    filePath: string,
    filename: string,
    timeoutMs: number
): Promise<{
    success: boolean;
    action?: Action;
    bytesBefore?: number;
    bytesAfter?: number;
    error?: string;
    deferred?: boolean;
}> {
    // Stage inside the destination directory so publishing is a rename on the
    // same filesystem, i.e. atomic. The old code wrote to /tmp and copyFile'd
    // in, which can expose a half-written video to a client mid-copy.
    // Unique per call. A fixed name here would let two concurrent runs point
    // two ffmpeg processes at one output file and then both rename it into the
    // served directory -- a corrupt video that could still pass verification.
    const tmpPath = path.join(OPTIMIZED_DIR, `${filename}.reoptimizing.${tempSuffix()}.tmp.mp4`);
    const optimizedPath = path.join(OPTIMIZED_DIR, filename);

    try {
        await fs.access(filePath);
        await fs.mkdir(OPTIMIZED_DIR, { recursive: true });
        await fs.rm(tmpPath, { force: true });

        const srcSize = await sizeOf(filePath);
        const srcDuration = await durationOf(filePath);

        // Decide which path this file takes.
        let action: Action = "transcode";
        if (await isPhoneSafe(filePath)) {
            const bitrate = parseInt(await probe("format=bit_rate", filePath), 10);
            if (Number.isFinite(bitrate) && bitrate > 0 && bitrate <= TARGET_BPS) {
                action = "remux";
            }
        }

        let args: string[];
        if (action === "remux") {
            args = [
                "-nostdin", "-v", "error", "-y",
                "-i", filePath,
                "-c", "copy",
                "-movflags", "+faststart",
                tmpPath,
            ];
        } else {
            const transfer = await probe("stream=color_transfer", filePath);
            const isHdr = transfer === "smpte2084" || transfer === "arib-std-b67";
            args = [
                "-nostdin", "-v", "error", "-y",
                "-i", filePath,
                // Trailing ? so clips with no audio track do not fail outright.
                "-map", "0:v:0", "-map", "0:a:0?",
                "-vf", isHdr ? HDR_CHAIN : SDR_CHAIN,
                "-c:v", "libx264", "-profile:v", "high", "-preset", PRESET,
                "-b:v", TARGET_BITRATE, "-maxrate", MAXRATE, "-bufsize", BUFSIZE,
                "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                tmpPath,
            ];
        }

        // execFile with an argument array, never exec with an interpolated
        // string: `filename` comes from the uploads table, and a file named
        // `x"; rm -rf /app; echo ".mp4` would otherwise run as shell.
        await execFileAsync("ffmpeg", args, {
            timeout: Math.min(PER_FILE_TIMEOUT_MS, Math.max(timeoutMs, 1_000)),
            maxBuffer: 1 << 20,
        });

        // Verify before letting it anywhere near the served directory.
        if (!(await isPhoneSafe(tmpPath))) {
            await fs.rm(tmpPath, { force: true });
            return { success: false, error: "output was not h264/8-bit" };
        }
        const outDuration = await durationOf(tmpPath);
        if (!(srcDuration > 0 && outDuration > 0 && Math.abs(srcDuration - outDuration) < 1)) {
            await fs.rm(tmpPath, { force: true });
            return {
                success: false,
                error: `duration changed: ${srcDuration.toFixed(2)}s -> ${outDuration.toFixed(2)}s`,
            };
        }

        const outSize = await sizeOf(tmpPath);
        await fs.rename(tmpPath, optimizedPath);
        await markVideoOptimized(filename);

        console.log(
            `Re-optimised (${action}): ${filename}  ` +
            `${Math.round(srcSize / 1048576)} MB -> ${Math.round(outSize / 1048576)} MB`
        );
        return { success: true, action, bytesBefore: srcSize, bytesAfter: outSize };
    } catch (error: any) {
        await fs.rm(tmpPath, { force: true }).catch(() => {});
        // Killed on our own timeout is not a failure of the file -- it simply
        // did not fit in this batch. No marker is written, the temp file is
        // gone, so the next press picks it up from the start.
        if (error?.killed || error?.signal === "SIGTERM") {
            console.log(`Deferred to the next batch (out of time): ${filename}`);
            return { success: false, deferred: true, error: "ran out of time in this batch" };
        }
        console.error(`Failed to re-optimise ${filename}:`, error);
        return { success: false, error: error?.message || "unknown error" };
    }
}
