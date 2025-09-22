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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authentication check
  const authCookie = req.cookies.get('hunter-auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    }, { status: 401 })
  }

  try {
    // 2. Parse and validate ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ 
        error: 'Invalid media ID',
        code: 'INVALID_ID'
      }, { status: 400 })
    }

    // 3. Get confirmation from request body
    const { confirmationPhrase, userConfirmed } = await req.json()
    
    // 4. Require explicit confirmation phrase
    const REQUIRED_PHRASE = 'DELETE HUNTER PHOTO PERMANENTLY'
    if (confirmationPhrase !== REQUIRED_PHRASE) {
      return NextResponse.json({ 
        error: 'Invalid confirmation phrase',
        code: 'INVALID_CONFIRMATION',
        requiredPhrase: REQUIRED_PHRASE
      }, { status: 400 })
    }

    // 5. Require user confirmation flag
    if (!userConfirmed) {
      return NextResponse.json({ 
        error: 'User confirmation required',
        code: 'CONFIRMATION_REQUIRED'
      }, { status: 400 })
    }

    // 6. Get media details before deletion (for logging)
    const media = await HunterMediaDB.getMediaById(id)
    if (!media) {
      return NextResponse.json({ 
        error: 'Media not found',
        code: 'NOT_FOUND'
      }, { status: 404 })
    }

    // 7. Log deletion attempt
    console.log(`🚨 DELETION ATTEMPT - Admin: boyboy, Media ID: ${id}, File: ${media.filename}`)
    console.log(`📸 Deleting: ${media.description || 'No description'} (${media.location_name || 'No location'})`)

    // 8. Perform deletion
    const result = await HunterMediaDB.deleteMediaFile(id)

    // 9. Log result
    if (result.success) {
      console.log(`✅ DELETION SUCCESSFUL - Media ID ${id} (${media.filename}) permanently deleted`)
      console.log(`🗑️ Files deleted: ${result.deletedFiles.join(', ')}`)
    } else {
      console.log(`❌ DELETION FAILED - Media ID ${id} (${media.filename})`)
      console.log(`🚫 Errors: ${result.errors.join(', ')}`)
    }

    // 10. Return result
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully deleted ${media.filename}` 
        : 'Deletion completed with errors',
      deletedFiles: result.deletedFiles,
      errors: result.errors,
      deletedMedia: {
        id: media.id,
        filename: media.filename,
        description: media.description,
        location_name: media.location_name
      }
    }, { 
      status: result.success ? 200 : 207 // 207 = Multi-Status (partial success)
    })

  } catch (error) {
    console.error('❌ CRITICAL ERROR during deletion:', error)
    return NextResponse.json({ 
      error: 'Internal server error during deletion',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}