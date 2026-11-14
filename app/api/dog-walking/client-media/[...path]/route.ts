export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getPool } from '@/lib/database'
import { getOwnerIdFromSession } from '@/lib/customerAuth'
import { isAuthenticated } from '@/lib/auth'
import { isParticipantAuthenticated } from '@/lib/helpingPawsAuth'

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

const pool = getPool()

/**
 * Error responses must be uncacheable.
 *
 * Cloudflare caches by file extension, so a .jpg URL is treated as cacheable
 * whatever the path. An unauthenticated probe returning a bare 404 got cached
 * at the edge for 4 hours and was then replayed to a correctly authenticated
 * client, blanking their gallery. no-store keeps auth outcomes per-request.
 */
function mediaError(message: string, status: number) {
    return NextResponse.json(
        { error: message },
        { status, headers: { 'Cache-Control': 'private, no-store' } }
    )
}

/**
 * Authorise a media request.
 *
 * This route had no authentication: anyone who guessed a filename could fetch
 * another client's photos and videos. Admins see everything; a customer may only
 * fetch files recorded against their own owner_id; Helping Paws participants are
 * allowed because step videos are served through this path too.
 *
 * As of 2026-11-01 this is the ONLY way client media can be fetched: the nginx
 * /client-media/ location is marked `internal`, so it is reachable solely via the
 * X-Accel-Redirect this route emits after authorising the request.
 */
async function isAuthorisedForFile(request: NextRequest, filePath: string): Promise<boolean> {
    if (isAuthenticated(request)) return true
    if (isParticipantAuthenticated(request)) return true

    const ownerId = getOwnerIdFromSession(request)
    if (ownerId === null) return false

    const client = await pool.connect()
    try {
        const result = await client.query(
            `SELECT 1 FROM hunters_hounds.client_media
             WHERE owner_id = $1 AND ($2 IN (file_path, thumbnail_path) OR $3 IN (filename))`,
            [ownerId, filePath, filePath.split('/').pop() ?? filePath]
        )
        return result.rows.length > 0
    } finally {
        client.release()
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const filePath = params.path.join('/')

        if (!(await isAuthorisedForFile(request, filePath))) {
            // 404, not 403: a distinguishable response would confirm which
            // filenames exist.
            return mediaError('File not found', 404)
        }

        // Security: prevent directory traversal
        if (filePath.includes('..') || params.path.some(p => p.startsWith('.'))) {
            return mediaError('Invalid path', 400)
        }

        const resolvedPath = path.resolve(CLIENT_MEDIA_DIR, filePath)
        if (!resolvedPath.startsWith(CLIENT_MEDIA_DIR)) {
            return mediaError('Invalid path', 400)
        }

        // Validate extension
        const ext = path.extname(resolvedPath).toLowerCase()
        if (!isSupportedFile(ext)) {
            return mediaError('Unsupported file type', 400)
        }

        // Confirm the file exists before handing off, so a missing file is a clean
        // 404 here rather than an nginx-level error after the redirect.
        try {
            await fs.stat(resolvedPath)
        } catch {
            return mediaError('File not found', 404)
        }

        // For videos, prefer the optimized version if one exists. Only the path
        // handed to nginx changes; authorisation above was done on the requested path.
        let servePath = filePath
        if (isVideoFile(ext)) {
            const filename = path.basename(resolvedPath)
            try {
                await fs.stat(path.join(OPTIMIZED_DIR, filename))
                servePath = `optimized/${filename}`
            } catch {
                // No optimized version; serve what was asked for.
            }
        }

        // Hand the actual file transfer to nginx via X-Accel-Redirect.
        //
        // Why not read and return the bytes: this route previously did fs.readFile
        // on the whole file, which with ~950 videos would push the container over on
        // concurrent viewing. nginx already has sendfile/aio tuned for these files and
        // handles Range requests natively, so video seeking works without the
        // hand-rolled range code this replaces.
        //
        // The URI below must match an `internal` location, or this becomes an open
        // redirect to arbitrary internal paths. Path traversal is already rejected above.
        //
        // Cache-Control is private + no-store: these are authorised per-viewer, and
        // 'public' previously let Cloudflare cache them at the edge, which would keep
        // serving them to anyone after the origin was locked down.
        const encodedPath = servePath.split('/').map(encodeURIComponent).join('/')
        return new NextResponse(null, {
            status: 200,
            headers: {
                'X-Accel-Redirect': `/client-media-internal/${encodedPath}`,
                'Content-Type': getContentType(ext),
                'Cache-Control': 'private, no-store',
            },
        })
    } catch (error) {
        console.error('Error serving client media:', error)
        return mediaError('Failed to serve file', 500)
    }
}
