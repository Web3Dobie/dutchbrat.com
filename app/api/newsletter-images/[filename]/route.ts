import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Newsletter images mounted from host via docker volume
const NEWSLETTER_IMAGES_DIR = "/app/newsletter-images";

export async function GET(
    request: NextRequest,
    { params }: { params: { filename: string } }
) {
    const filename = params.filename;

    // Security: prevent directory traversal
    if (!filename || filename.includes("..") || filename.includes("/")) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Validate extension
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(filename).toLowerCase();
    if (!validExtensions.includes(ext)) {
        return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const filePath = path.join(NEWSLETTER_IMAGES_DIR, filename);

    if (!existsSync(filePath)) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    try {
        const imageBuffer = await readFile(filePath);

        const contentTypes: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        };

        return new NextResponse(imageBuffer, {
            headers: {
                "Content-Type": contentTypes[ext] || "image/jpeg",
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch (error) {
        console.error("Error serving newsletter image:", error);
        return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
    }
}
