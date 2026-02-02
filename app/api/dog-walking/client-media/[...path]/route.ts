export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Client media mounted from host via docker volume
const CLIENT_MEDIA_DIR = "/app/client-media";
const OPTIMIZED_DIR = path.join(CLIENT_MEDIA_DIR, "optimized");

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
        let actualPath = resolvedPath

        try {
            stats = await fs.stat(resolvedPath)
        } catch {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        const contentType = getContentType(ext)

        // For videos, prefer optimized version if it exists
        if (isVideoFile(ext)) {
            const filename = path.basename(resolvedPath)
            const optimizedPath = path.join(OPTIMIZED_DIR, filename)
            try {
                const optimizedStats = await fs.stat(optimizedPath)
                // Use optimized version
                actualPath = optimizedPath
                stats = optimizedStats
                console.log(`Serving optimized video: ${filename}`)
            } catch {
                // No optimized version, use original
                console.log(`Serving original video (no optimized version): ${filename}`)
            }
        }

        const fileSize = stats.size

        // For videos, support range requests for proper streaming
        if (isVideoFile(ext)) {
            const rangeHeader = request.headers.get('range')

            if (rangeHeader) {
                // Parse range header
                const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
                if (match) {
                    const start = parseInt(match[1], 10)
                    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
                    const chunkSize = end - start + 1

                    // Read the requested chunk
                    const fileHandle = await fs.open(actualPath, 'r')
                    const buffer = Buffer.alloc(chunkSize)
                    await fileHandle.read(buffer, 0, chunkSize, start)
                    await fileHandle.close()

                    return new NextResponse(new Uint8Array(buffer), {
                        status: 206,
                        headers: {
                            'Content-Type': contentType,
                            'Content-Length': chunkSize.toString(),
                            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                            'Accept-Ranges': 'bytes',
                            'Cache-Control': 'public, max-age=86400',
                        },
                    })
                }
            }

            // No range requested - return full file with Accept-Ranges header
            const fileBuffer = await fs.readFile(actualPath)
            return new NextResponse(new Uint8Array(fileBuffer), {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': fileSize.toString(),
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=86400',
                },
            })
        }

        // Handle images
        const fileBuffer = await fs.readFile(actualPath)
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
