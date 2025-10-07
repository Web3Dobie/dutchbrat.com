// app/api/hunter/media/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMediaFiles } from '../../../../lib/hunterMedia'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const filters = {
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') as 'image' | 'video' | undefined,
      startDate: searchParams.get('dateFrom') || undefined,
      endDate: searchParams.get('dateTo') || undefined,
      tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,  // ADD THIS LINE
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    }

    console.log('API Route - Received filters:', filters) // Debug log

    // Use the direct function instead of the class
    const result = await getMediaFiles(filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}