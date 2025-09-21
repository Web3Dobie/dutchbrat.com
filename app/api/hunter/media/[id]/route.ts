// app/api/hunter/media/[id]/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { HunterMediaDB } from '../../../../../lib/hunterMedia'

// Auth middleware
function checkAuth(req: NextRequest) {
  const authCookie = req.cookies.get('hunter-auth')
  return authCookie?.value === 'authenticated'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  try {
    const mediaId = parseInt(params.id)
    const updates = await req.json()
    
    const updatedMedia = await HunterMediaDB.updateMedia(mediaId, updates)
    
    return NextResponse.json(updatedMedia)
  } catch (error) {
    console.error('Error updating media:', error)
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 })
  }
}