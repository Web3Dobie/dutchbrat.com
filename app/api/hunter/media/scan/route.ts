// app/api/hunter/media/scan/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { HunterMediaDB } from '../../../../../lib/hunterMedia'

// Auth middleware
function checkAuth(req: NextRequest) {
  const authCookie = req.cookies.get('hunter-auth')
  return authCookie?.value === 'authenticated'
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  try {
    console.log('Starting media scan...')
    const processedFiles = await HunterMediaDB.scanAndProcessNewFiles('boyboy')
    
    return NextResponse.json({
      success: true,
      processedCount: processedFiles.length,
      processedFiles: processedFiles.map(f => ({
        id: f.id,
        filename: f.filename,
        media_type: f.media_type,
        taken_at: f.taken_at,
        has_location: !!(f.location_lat && f.location_lng)
      }))
    })
  } catch (error) {
    console.error('Error scanning media:', error)
    return NextResponse.json({ error: 'Failed to scan media files' }, { status: 500 })
  }
}