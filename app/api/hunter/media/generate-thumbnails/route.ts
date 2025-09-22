// app/api/hunter/media/generate-thumbnails/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMediaFiles, updateThumbnailPaths } from '../../../../../lib/hunterMedia'
import path from 'path'
import { thumbnailGenerator } from '../../../../../lib/thumbnailGenerator'

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
    console.log('🔄 Starting missing thumbnails generation...')
    const startTime = Date.now()
    
    // Find files without thumbnails
    const filesWithoutThumbnails = await findFilesWithoutThumbnails()
    console.log(`📊 Found ${filesWithoutThumbnails.length} files without thumbnails`)
    
    if (filesWithoutThumbnails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All files already have thumbnails',
        processedCount: 0,
        skippedCount: 0
      })
    }
    
    // Generate thumbnails for each file
    let processedCount = 0
    let skippedCount = 0
    const results: Array<{
      id: number
      filename: string
      thumbnails_generated: number
      thumbnail_paths: any
    }> = []
    
    for (const file of filesWithoutThumbnails) {
      try {
        console.log(`🖼️ Processing: ${file.filename}`)
        
        // Only process images
        if (file.media_type !== 'image' || !thumbnailGenerator.isImageSupported(file.filename)) {
          console.log(`⚠️ Skipping unsupported file: ${file.filename} (media_type: ${file.media_type}, supported: ${thumbnailGenerator.isImageSupported(file.filename)})`)
          skippedCount++
          continue
        }
        
        // Build full path to original file
        const mediaPath = '/app/hunter-media'
        // Since file_path is just the filename, we need to look in the originals directory
        // Try to guess the year from the filename or use a search approach
        let fullPath = ''
        if (file.file_path.startsWith('/originals/')) {
          // File path is already complete like "/originals/2021/filename.jpg"
          fullPath = path.join(mediaPath, file.file_path)
        } else {
          // Fallback for old-style paths
          fullPath = path.join(mediaPath, 'originals', file.file_path)
        }

        console.log(`File path from DB: ${file.file_path}`)
        console.log(`Constructed full path: ${fullPath}`)

        // Check if file exists
        const fs = require('fs').promises
        let fileFound = false
        try {
          await fs.access(fullPath)
          fileFound = true
          console.log(`File found at: ${fullPath}`)
        } catch (error) {
          console.log(`File NOT found at: ${fullPath}`)
        }
        
        // Generate thumbnails
        const thumbnailPaths = await thumbnailGenerator.generateThumbnails(fullPath, file.filename)
        
        if (Object.keys(thumbnailPaths).length > 0) {
          // Update database with thumbnail paths
          await updateThumbnailPathsInDB(file.id, thumbnailPaths)
          processedCount++
          
          results.push({
            id: file.id,
            filename: file.filename,
            thumbnails_generated: Object.keys(thumbnailPaths).length,
            thumbnail_paths: thumbnailPaths
          })
          
          console.log(`✅ Generated ${Object.keys(thumbnailPaths).length} thumbnails for ${file.filename}`)
        } else {
          console.log(`❌ No thumbnails generated for ${file.filename}`)
          skippedCount++
        }
        
      } catch (error) {
        console.error(`❌ Failed to process ${file.filename}:`, error)
        skippedCount++
      }
    }
    
    const processingTime = (Date.now() - startTime) / 1000
    console.log(`✅ Thumbnail generation completed in ${processingTime}s`)
    
    return NextResponse.json({
      success: true,
      processedCount,
      skippedCount,
      totalFound: filesWithoutThumbnails.length,
      processingTimeSeconds: processingTime,
      results
    })
    
  } catch (error) {
    console.error('❌ Missing thumbnails generation failed:', error)
    return NextResponse.json({ 
      error: 'Failed to generate missing thumbnails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Find all files that don't have thumbnails
 */
async function findFilesWithoutThumbnails() {
  try {
    // Get ALL media files from database, then filter in JavaScript to avoid SQL issues
    const allMedia = await getMediaFiles({ limit: 1000 })
    
    // Filter for image files missing any thumbnails
    const filesWithoutThumbnails = allMedia.media.filter(file => 
      file.media_type === 'image' && // Only images
      (!file.thumbnail_150 || !file.thumbnail_500 || !file.thumbnail_1200) // Missing thumbnails
    )
    
    console.log(`🔍 Checked ${allMedia.media.length} total files, found ${filesWithoutThumbnails.length} images without complete thumbnails`)
    
    return filesWithoutThumbnails.map(file => ({
      id: file.id,
      filename: file.filename,
      file_path: file.file_path,
      media_type: file.media_type,
      thumbnail_150: file.thumbnail_150,
      thumbnail_500: file.thumbnail_500,
      thumbnail_1200: file.thumbnail_1200
    }))
    
  } catch (error) {
    console.error('❌ Error finding files without thumbnails:', error)
    throw new Error(`Failed to query database: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Update thumbnail paths in database
 */
async function updateThumbnailPathsInDB(id: number, thumbnails: {
  thumbnail_150?: string
  thumbnail_500?: string
  thumbnail_1200?: string
}): Promise<void> {
  try {
    // Use the existing updateThumbnailPaths function directly
    await updateThumbnailPaths(id, thumbnails)
    console.log(`💾 Updated database with thumbnail paths for media ID ${id}`)
  } catch (error) {
    console.error(`❌ Failed to update thumbnail paths for media ID ${id}:`, error)
    throw new Error(`Database update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate file path and permissions
 */
function validateFilePath(filePath: string): boolean {
  try {
    // Ensure the path is within the media directory
    const mediaPath = '/app/hunter-media'
    const fullPath = path.join(mediaPath, filePath)
    const resolvedPath = path.resolve(fullPath)
    
    return resolvedPath.startsWith(path.resolve(mediaPath))
  } catch (error) {
    console.error('❌ File path validation failed:', error)
    return false
  }
}

/**
 * Get file statistics for reporting
 */
function getFileStats(files: any[]): {
  totalFiles: number
  withAllThumbnails: number
  withSomeThumbnails: number
  withNoThumbnails: number
} {
  const stats = {
    totalFiles: files.length,
    withAllThumbnails: 0,
    withSomeThumbnails: 0,
    withNoThumbnails: 0
  }
  
  files.forEach(file => {
    const thumbnailCount = [
      file.thumbnail_150,
      file.thumbnail_500,
      file.thumbnail_1200
    ].filter(Boolean).length
    
    if (thumbnailCount === 3) {
      stats.withAllThumbnails++
    } else if (thumbnailCount > 0) {
      stats.withSomeThumbnails++
    } else {
      stats.withNoThumbnails++
    }
  })
  
  return stats
}