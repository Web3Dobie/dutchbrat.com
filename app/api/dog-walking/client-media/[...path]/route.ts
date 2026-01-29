export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Client media mounted from host via docker volume
const CLIENT_MEDIA_DIR = "/app/client-media";

// Supported file extensions with MIME types
function getContentType(ext: string): string {
    const types: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
        '.mp4': 'video/mp4',
        '.m4v': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
    }
    return types[ext] || 'application/octet-stream'
}

function isVideoFile(ext: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.m4v', '.webm']
    return videoExtensions.includes(ext.toLowerCase())
}

function isSupportedFile(ext: string): boolean {
    const supported = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.mp4', '.m4v', '.mov', '.avi']
    return supported.includes(ext.toLowerCase())
}

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const filePath = params.path.join('/')

        // Security: prevent directory traversal
        if (filePath.includes('..') || params.path.some(p => p.startsWith('.'))) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
        }

        const resolvedPath = path.resolve(CLIENT_MEDIA_DIR, filePath)
        if (!resolvedPath.startsWith(CLIENT_MEDIA_DIR)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
        }

        // Validate extension
        const ext = path.extname(resolvedPath).toLowerCase()
        if (!isSupportedFile(ext)) {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
        }

        // Check if file exists and get stats
        let stats
        try {
            stats = await fs.stat(resolvedPath)
        } catch {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        const contentType = getContentType(ext)
        const fileSize = stats.size
        const fileBuffer = await fs.readFile(resolvedPath)

        // For videos, force HTTP/1.1 to avoid HTTP/2 issues
        if (isVideoFile(ext)) {
            return new NextResponse(new Uint8Array(fileBuffer), {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': fileSize.toString(),
                    'Cache-Control': 'public, max-age=86400',
                    'Connection': 'close',
                    'Upgrade': 'http/1.1',
                },
            })
        }

        // Handle images
        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileSize.toString(),
                'Cache-Control': 'public, max-age=86400',
            },
        })
    } catch (error) {
        console.error('Error serving client media:', error)
        return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
    }
}
