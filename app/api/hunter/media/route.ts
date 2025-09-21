// app/api/hunter/media/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { HunterMediaDB } from '../../../../lib/hunterMedia'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    const filters = {
      search: searchParams.get('search') || undefined,
      mediaType: searchParams.get('type') as 'image' | 'video' | undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      hasLocation: searchParams.get('hasLocation') === 'true',
      tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    }
    
    const result = await HunterMediaDB.getMedia(filters)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}