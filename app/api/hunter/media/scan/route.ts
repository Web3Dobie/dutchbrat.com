// app/api/hunter/media/scan/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { scanAndProcessNewFiles } from '../../../../../lib/enhancedMediaScanner'

// Auth middleware
function checkAuth(req: NextRequest) {
  const authCookie = req.cookies.get('hunter-auth')
  return authCookie?.value === 'authenticated'
}

export const maxDuration = 300 // 5 minutes

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  try {
    console.log('🔍 Starting enhanced media scan with thumbnail generation...')
    const startTime = Date.now()
    
    // Use enhanced scanner with thumbnail generation
    const processedFiles = await scanAndProcessNewFiles('boyboy')
    
    const processingTime = (Date.now() - startTime) / 1000
    console.log(`✅ Enhanced scan completed in ${processingTime}s`)
    
    return NextResponse.json({
      success: true,
      processedCount: processedFiles.length,
      processingTimeSeconds: processingTime,
      processedFiles: processedFiles.map(f => ({
        id: f.id,
        filename: f.filename,
        media_type: f.media_type,
        taken_at: f.taken_at,
        has_location: f.has_location,
        thumbnails_generated: !!(f.thumbnail_150 || f.thumbnail_500 || f.thumbnail_1200),
        thumbnail_count: [f.thumbnail_150, f.thumbnail_500, f.thumbnail_1200].filter(Boolean).length
      }))
    })
  } catch (error) {
    console.error('❌ Enhanced media scan failed:', error)
    return NextResponse.json({ 
      error: 'Failed to scan and process media files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}