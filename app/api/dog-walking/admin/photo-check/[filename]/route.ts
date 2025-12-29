import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

// GET - Check if photo file exists
export async function GET(
    request: NextRequest,
    { params }: { params: { filename: string } }
) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const filename = params.filename;
        
        if (!filename) {
            return NextResponse.json(
                { error: "Filename is required" },
                { status: 400 }
            );
        }

        // Validate file extension
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExt = path.extname(filename.toLowerCase());
        
        if (!validExtensions.includes(fileExt)) {
            return NextResponse.json({
                success: false,
                exists: false,
                error: "Invalid file extension. Use: .jpg, .jpeg, .png, .gif, .webp"
            });
        }

        // Check if file exists in public/images/dogs/
        const filePath = path.join(process.cwd(), 'public', 'images', 'dogs', filename);
        
        try {
            const stats = await fs.stat(filePath);
            return NextResponse.json({
                success: true,
                exists: true,
                filename,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                path: `/images/dogs/${filename}`
            });
        } catch {
            // File doesn't exist
            return NextResponse.json({
                success: true,
                exists: false,
                filename,
                message: "File not found"
            });
        }

    } catch (error) {
        console.error("Photo check error:", error);
        return NextResponse.json(
            { 
                error: "Error checking photo file",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}