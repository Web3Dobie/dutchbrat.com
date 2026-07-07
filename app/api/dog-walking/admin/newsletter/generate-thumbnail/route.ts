import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const execAsync = promisify(exec);

const NEWSLETTER_MEDIA_DIR = "/app/hunter-media/newsletter";
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".avi", ".m4v"];

async function getVideoDuration(videoPath: string): Promise<number> {
    try {
        const { stdout } = await execAsync(
            `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`
        );
        const d = parseFloat(stdout.trim());
        return isNaN(d) ? 10 : d;
    } catch {
        return 10;
    }
}

// GET — list all video files in the newsletter media dir with thumbnail status
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const entries = await fs.readdir(NEWSLETTER_MEDIA_DIR);
        const videos = entries.filter(f =>
            VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase())
        );

        const results = await Promise.all(videos.map(async filename => {
            const stem = path.parse(filename).name;
            const thumbnailFilename = `${stem}.jpg`;
            let hasThumbnail = false;
            try {
                await fs.access(path.join(NEWSLETTER_MEDIA_DIR, thumbnailFilename));
                hasThumbnail = true;
            } catch { /* not found */ }
            return { filename, thumbnailFilename, hasThumbnail };
        }));

        return NextResponse.json({ success: true, videos: results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function applyFaststart(videoPath: string): Promise<void> {
    const tempPath = `${videoPath}.faststart.mp4`;
    try {
        await execAsync(`ffmpeg -i "${videoPath}" -c copy -movflags +faststart "${tempPath}" -y`);
        await fs.rename(tempPath, videoPath);
    } catch (err) {
        try { await fs.unlink(tempPath); } catch { /* ignore */ }
        throw err;
    }
}

// POST — generate thumbnail(s) and apply faststart. Body: { filename?: string } — omit to process all
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    try {
        const body = await request.json().catch(() => ({}));
        const { filename } = body;

        // Check ffmpeg
        try {
            await execAsync("ffmpeg -version");
        } catch {
            return NextResponse.json({ error: "FFmpeg is not available" }, { status: 500 });
        }

        const entries = await fs.readdir(NEWSLETTER_MEDIA_DIR);

        let targets: string[];
        if (filename) {
            if (!entries.includes(filename)) {
                return NextResponse.json({ error: "File not found" }, { status: 404 });
            }
            targets = [filename];
        } else {
            targets = entries.filter(f =>
                VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase())
            );
        }

        const results: { filename: string; success: boolean; thumbnailGenerated: boolean; faststartApplied: boolean; error?: string }[] = [];

        for (const vid of targets) {
            const stem = path.parse(vid).name;
            const thumbFilename = `${stem}.jpg`;
            const videoPath = path.join(NEWSLETTER_MEDIA_DIR, vid);
            const thumbPath = path.join(NEWSLETTER_MEDIA_DIR, thumbFilename);

            let thumbnailGenerated = false;
            let faststartApplied = false;

            try {
                // Generate thumbnail only if missing (or explicit single-file request)
                let needsThumb = !!filename;
                if (!needsThumb) {
                    try { await fs.access(thumbPath); } catch { needsThumb = true; }
                }

                if (needsThumb) {
                    const duration = await getVideoDuration(videoPath);
                    const seekTime = Math.min(1, duration * 0.1);
                    await execAsync(
                        `ffmpeg -i "${videoPath}" -ss ${seekTime} -vframes 1 -vf "scale=1280:-1" -q:v 2 -update 1 "${thumbPath}" -y`
                    );
                    thumbnailGenerated = true;
                }

                // Always apply faststart so Cloudflare can stream the video
                try {
                    await applyFaststart(videoPath);
                    faststartApplied = true;
                } catch { /* non-fatal */ }

                results.push({ filename: vid, success: true, thumbnailGenerated, faststartApplied });
            } catch (err: any) {
                results.push({ filename: vid, success: false, thumbnailGenerated, faststartApplied, error: err.message });
            }
        }

        const generated = results.filter(r => r.thumbnailGenerated).length;
        const optimized = results.filter(r => r.faststartApplied).length;
        const failed = results.filter(r => !r.success).length;

        return NextResponse.json({ success: true, generated, optimized, failed, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
