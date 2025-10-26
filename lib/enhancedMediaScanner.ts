// lib/enhancedMediaScanner.ts
import { readdir, stat } from 'fs/promises'
import path from 'path'
import { readFile } from 'fs/promises'
import { extractExifData, ProcessedExifData, parseDateFromFilename } from './hunterMedia'
import { videoThumbnailGenerator } from './videoThumbnailGenerator'
import { Pool } from 'pg'

// Replace the getPool function with this:
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'agents_platform',
      user: process.env.POSTGRES_USER || 'hunter_admin',
      password: process.env.POSTGRES_PASSWORD || 'YourSecurePassword123!',
      ssl: false  // KEY FIX: Disable SSL for local Docker PostgreSQL
    })
  }
  return pool
}

let pool: Pool | null = null
import { thumbnailGenerator, ThumbnailPaths } from './thumbnailGenerator'

export interface ScanResult {
  id: number
  filename: string
  media_type: 'image' | 'video'
  taken_at?: string
  has_location: boolean
  thumbnail_150?: string
  thumbnail_500?: string
  thumbnail_1200?: string
}

interface MediaFile {
  id: number
  filename: string
  file_path: string
  media_type: 'image' | 'video'
  file_size?: number
  taken_at?: string
  location_lat?: number
  location_lng?: number
  location_name?: string
  description?: string
  created_at: string
  thumbnail_150?: string
  thumbnail_500?: string
  thumbnail_1200?: string
}

export class EnhancedMediaScanner {
  private readonly mediaPath: string
  private isScanning = false

  constructor(mediaPath = '/app/hunter-media') {
    this.mediaPath = mediaPath
  }

  /**
   * Scan for new files and process them with thumbnails
   */
  async scanAndProcessNewFiles(uploadedBy: string): Promise<ScanResult[]> {
    
    console.log('🔍 Starting enhanced media scan with thumbnail generation...')

    try {
      // Get existing files from database with error handling
      const existingFiles = await this.getExistingFilenames()
      console.log(`📊 Found ${existingFiles.size} existing files in database`)

      // SAFETY CHECK: If we got 0 existing files but we expect some, abort
      if (existingFiles.size === 0) {
        console.error('❌ SAFETY CHECK FAILED: Database returned 0 existing files')
        console.error('❌ This would cause all filesystem files to be treated as new')
        throw new Error('Database appears to be empty or inaccessible - aborting scan for safety')
      }

      // Scan file system
      const foundFiles = await this.scanDirectory(path.join(this.mediaPath, 'originals'))
      console.log(`📁 Found ${foundFiles.length} files in directory`)

      // Filter for new files
      const newFiles = foundFiles.filter(file => !existingFiles.has(file.filename))
      console.log(`✨ Processing ${newFiles.length} new files`)

      if (newFiles.length === 0) {
        console.log('✅ No new files to process')
        return []
      }

      // Process each new file
      const processedFiles: ScanResult[] = []

      for (const file of newFiles) {
        try {
          console.log(`🔄 Processing: ${file.filename}`)
          const result = await this.processFile(file, uploadedBy)
          if (result) {
            processedFiles.push(result)
            console.log(`✅ Successfully processed: ${file.filename}`)
          }
        } catch (error) {
          console.error(`❌ Failed to process ${file.filename}:`, error)
          // Continue with other files
        }
      }

      console.log(`🎉 Enhanced scan complete! Processed ${processedFiles.length} files with thumbnails`)
      return processedFiles

    } catch (error) {
      console.error('❌ Enhanced media scan failed:', error)
      throw error
    }
  }

  /**
   * Process a single file: extract EXIF, generate thumbnails, save to database
   */
  private async processFile(
  file: { filename: string; fullPath: string; stats: any },
  uploadedBy: string
): Promise<ScanResult | null> {
  try {
    const mediaType = this.getMediaType(file.filename)
    console.log(`🔄 Processing ${mediaType}: ${file.filename}`)

    // Extract metadata based on file type
    let exifData: ProcessedExifData = {}
    
    if (mediaType === 'image') {
      // Extract EXIF data for images
      try {
        const buffer = await readFile(file.fullPath)
        exifData = extractExifData(buffer.buffer as ArrayBuffer)
        console.log(`📊 EXIF extracted for ${file.filename}:`, {
          hasDate: !!exifData.dateTime,
          hasGPS: !!(exifData.latitude && exifData.longitude),
          camera: exifData.camera
        })
      } catch (error) {
        console.warn(`⚠️ EXIF extraction failed for ${file.filename}:`, error)
      }
      
      // If no EXIF date, try filename parsing as backup
      if (!exifData.dateTime) {
        const parsedDate = parseDateFromFilename(file.filename)
        if (parsedDate) {
          exifData.dateTime = parsedDate
          console.log(`📅 Used filename date for image: ${parsedDate.toISOString()}`)
        }
      }
      
    } else if (mediaType === 'video') {
      // For videos, parse date from filename (videos rarely have usable metadata)
      const parsedDate = parseDateFromFilename(file.filename)
      if (parsedDate) {
        exifData.dateTime = parsedDate
        console.log(`📅 Date parsed from video filename ${file.filename}: ${parsedDate.toISOString()}`)
      }
    }

    // Generate thumbnails
    let thumbnailPaths: ThumbnailPaths = {}
    
    if (mediaType === 'image' && thumbnailGenerator.isImageSupported(file.filename)) {
      // Generate image thumbnails
      try {
        console.log(`🖼️ Generating thumbnails for image: ${file.filename}...`)
        thumbnailPaths = await thumbnailGenerator.generateThumbnails(file.fullPath, file.filename)
        console.log(`✅ Generated ${Object.keys(thumbnailPaths).length} image thumbnails for ${file.filename}`)
      } catch (error) {
        console.error(`❌ Image thumbnail generation failed for ${file.filename}:`, error)
      }
    } else if (mediaType === 'video') {
      // Generate video thumbnails
      try {
        console.log(`🎬 Generating video thumbnails for: ${file.filename}...`)
        
        // Check if FFmpeg is available
        const ffmpegAvailable = await videoThumbnailGenerator.isFFmpegAvailable()
        if (!ffmpegAvailable) {
          console.warn(`⚠️ FFmpeg not available - skipping video thumbnail generation for ${file.filename}`)
        } else {
          thumbnailPaths = await videoThumbnailGenerator.generateVideoThumbnails(file.fullPath, file.filename)
          console.log(`✅ Generated ${Object.keys(thumbnailPaths).length} video thumbnails for ${file.filename}`)
        }
      } catch (error) {
        console.error(`❌ Video thumbnail generation failed for ${file.filename}:`, error)
        // Continue without thumbnails - video will still be added to database
      }
    }

    // Calculate relative path for database storage
    let relativePath = file.fullPath.replace(this.mediaPath, '')
    if (!relativePath.startsWith('/originals/')) {
      const cleanPath = relativePath.replace(/^\/+/, '')
      relativePath = `/originals/${cleanPath}`
    }

    // Save to database
    const savedMedia = await this.saveToDatabase({
      filename: file.filename,
      filePath: relativePath,
      mediaType,
      fileSize: file.stats.size,
      exifData,
      thumbnailPaths,
      uploadedBy
    })

    console.log(`✅ Successfully processed and saved: ${file.filename}`)

    return {
      id: savedMedia.id,
      filename: savedMedia.filename,
      media_type: savedMedia.media_type,
      taken_at: savedMedia.taken_at,
      has_location: !!(savedMedia.location_lat && savedMedia.location_lng),
      thumbnail_150: savedMedia.thumbnail_150,
      thumbnail_500: savedMedia.thumbnail_500,
      thumbnail_1200: savedMedia.thumbnail_1200
    }

  } catch (error) {
    console.error(`❌ Error processing file ${file.filename}:`, error)
    return null
  }
}

  /**
   * Save processed file data to database
   */
  private async saveToDatabase(data: {
    filename: string
    filePath: string
    mediaType: 'image' | 'video'
    fileSize: number
    exifData: ProcessedExifData
    thumbnailPaths: ThumbnailPaths
    uploadedBy: string
  }): Promise<MediaFile> {
    const pool = getPool()

    const query = `
      INSERT INTO hunter_media.media (
        filename, original_filename, file_path, media_type, file_size,
        taken_at, location_lat, location_lng, camera_make, camera_model,
        uploaded_by, uploaded_at,
        thumbnail_150, thumbnail_500, thumbnail_1200, orientation
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, NOW(),
        $12, $13, $14, $15
      )
      ON CONFLICT (filename) DO NOTHING
      RETURNING *
    `

    const values = [
      data.filename,                              // $1
      data.filename,                              // $2
      data.filePath,                              // $3
      data.mediaType,                             // $4
      data.fileSize,                              // $5
      data.exifData.dateTime || null,            // $6
      data.exifData.latitude || null,            // $7
      data.exifData.longitude || null,           // $8
      data.exifData.camera?.split(' ')[0] || null, // $9 (make)
      data.exifData.camera?.split(' ').slice(1).join(' ') || null, // $10 (model)
      data.uploadedBy,                            // $11
      data.thumbnailPaths.thumbnail_150 || null, // $12
      data.thumbnailPaths.thumbnail_500 || null, // $13
      data.thumbnailPaths.thumbnail_1200 || null, // $14
      data.exifData.orientation || 1             // $15
    ]

    const result = await pool.query(query, values)
    if (result.rows.length === 0) {
      // File already exists, get existing record
      const existingResult = await pool.query('SELECT * FROM hunter_media.media WHERE filename = $1', [data.filename])
      return existingResult.rows[0]
    }
    return result.rows[0]
  }

  /**
   * Get existing filenames from database with proper error handling
   */
  private async getExistingFilenames(): Promise<Set<string>> {
    try {
      const pool = getPool()
      
      // Test connection first
      await pool.query('SELECT 1')
      
      const result = await pool.query('SELECT filename FROM hunter_media.media')
      const filenames = new Set(result.rows.map(row => row.filename))
      
      console.log(`[SUCCESS] Successfully retrieved ${filenames.size} existing filenames from database`)
      
      // Sanity check - we should have a reasonable number of files
      if (filenames.size === 0) {
        console.warn('[WARNING] Database returned 0 filenames - this might indicate a problem')
      }
      
      return filenames
      
    } catch (error) {
      console.error('[CRITICAL] Failed to get existing filenames from database:', error)
      console.error('[CRITICAL] This would cause all files to be treated as new - ABORTING SCAN')
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Recursively scan directory for media files
   */
  private async scanDirectory(dirPath: string): Promise<Array<{ filename: string, fullPath: string, stats: any }>> {
    const files: Array<{ filename: string, fullPath: string, stats: any }> = []

    try {
      const entries = await readdir(dirPath)

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry)
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          // Recurse into subdirectories
          const subFiles = await this.scanDirectory(fullPath)
          files.push(...subFiles)
        } else if (this.isSupportedFile(entry)) {
          files.push({
            filename: entry,
            fullPath,
            stats
          })
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not scan directory ${dirPath}:`, error)
    }

    return files
  }

  /**
   * Check if file is a supported media type
   */
  private isSupportedFile(filename: string): boolean {
    const supportedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic',
      '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'
    ]
    const ext = path.extname(filename).toLowerCase()
    return supportedExtensions.includes(ext)
  }

  /**
   * Determine media type from filename
   */
  private getMediaType(filename: string): 'image' | 'video' {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic']
    const ext = path.extname(filename).toLowerCase()
    return imageExtensions.includes(ext) ? 'image' : 'video'
  }
}

// Export default instance
export const enhancedMediaScanner = new EnhancedMediaScanner()

// Global lock to prevent multiple scans across all instances
let isGlobalScanning = false

// Helper function for API routes
export async function scanAndProcessNewFiles(uploadedBy: string): Promise<ScanResult[]> {
  if (isGlobalScanning) {
    console.log('GLOBAL: Scan already in progress, rejecting new scan request')
    throw new Error('Scan already in progress')
  }
  
  isGlobalScanning = true
  try {
    const result = await enhancedMediaScanner.scanAndProcessNewFiles(uploadedBy)
    console.log('GLOBAL: Scan completed successfully')
    return result
  } finally {
    isGlobalScanning = false
    console.log('GLOBAL: Released scan lock')
  }
}