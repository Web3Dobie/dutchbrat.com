import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Client media mounted from host via docker volume
const CLIENT_MEDIA_DIR = "/app/client-media";

// Supported file extensions with MIME types
const CONTENT_TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".heic": "image/heic",
};

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const pathSegments = params.path;

    // Validate path segments
    if (!pathSegments || pathSegments.length === 0) {
        return NextResponse.json({ error: "No file path provided" }, { status: 400 });
    }

    // Security: prevent directory traversal
    for (const segment of pathSegments) {
        if (segment.includes("..") || segment.startsWith(".")) {
            return NextResponse.json({ error: "Invalid path" }, { status: 400 });
        }
    }

    const relativePath = pathSegments.join("/");
    const filePath = path.join(CLIENT_MEDIA_DIR, relativePath);

    // Additional security: ensure resolved path is within the allowed directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(CLIENT_MEDIA_DIR)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Validate extension
    const ext = path.extname(filePath).toLowerCase();
    if (!CONTENT_TYPES[ext]) {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (!existsSync(filePath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": CONTENT_TYPES[ext],
                "Cache-Control": "public, max-age=86400", // 24 hour cache
            },
        });
    } catch (error) {
        console.error("Error serving client media:", error);
        return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
    }
}
