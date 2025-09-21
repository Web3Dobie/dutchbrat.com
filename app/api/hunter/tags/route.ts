// app/api/hunter/tags/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { HunterMediaDB } from '../../../../lib/hunterMedia'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tagType = searchParams.get('type') || undefined
    
    const tags = await HunterMediaDB.getExistingTags(tagType)
    
    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authCookie = req.cookies.get('hunter-auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  try {
    const { mediaId, tagType, tagValue } = await req.json()
    
    const tag = await HunterMediaDB.addTag(mediaId, tagType, tagValue, 'boyboy')
    
    return NextResponse.json(tag)
  } catch (error) {
    console.error('Error adding tag:', error)
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const authCookie = req.cookies.get('hunter-auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  try {
    const { mediaId, tagType, tagValue } = await req.json()
    
    const success = await HunterMediaDB.removeTag(mediaId, tagType, tagValue)
    
    return NextResponse.json({ success })
  } catch (error) {
    console.error('Error removing tag:', error)
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
  }
}