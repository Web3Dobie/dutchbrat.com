export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    const MEDIA_BASE_PATH = '/var/hunter-media'
    
    // Security: prevent directory traversal
    const resolvedPath = path.resolve(MEDIA_BASE_PATH, filePath)
    if (!resolvedPath.startsWith(MEDIA_BASE_PATH)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // Check if file exists
    try {
      await fs.access(resolvedPath)
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Determine content type
    const ext = path.extname(resolvedPath).toLowerCase()
    const contentType = getContentType(ext)

    // Read file
    const fileBuffer = await fs.readFile(resolvedPath)

    // Convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}

function getContentType(ext: string): string {
  const types: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.heic': 'image/heic',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
  }
  return types[ext] || 'application/octet-stream'
}