// lib/thumbnailGenerator.ts
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

export interface ThumbnailPaths {
  thumbnail_150?: string
  thumbnail_500?: string  
  thumbnail_1200?: string
}

export class ThumbnailGenerator {
  private readonly mediaPath: string
  private readonly thumbnailPath: string

  constructor(mediaPath = '/app/hunter-media') {
    this.mediaPath = mediaPath
    this.thumbnailPath = path.join(mediaPath, 'thumbnails')
  }

  /**
   * Generate all thumbnail sizes for an image
   */
  async generateThumbnails(originalPath: string, filename: string): Promise<ThumbnailPaths> {
    try {
      // Ensure thumbnail directories exist
      await this.ensureThumbnailDirectories()

      const thumbnailPaths: ThumbnailPaths = {}
      const sizes = [150, 500, 1200] as const

      // Get file extension and create base filename
      const ext = path.extname(filename)
      const baseName = path.basename(filename, ext)
      
      // Generate each thumbnail size
      for (const size of sizes) {
        const thumbnailFilename = `${baseName}_${size}${ext}`
        const thumbnailFullPath = path.join(this.thumbnailPath, size.toString(), thumbnailFilename)
        const relativePath = `/thumbnails/${size}/${thumbnailFilename}`

        try {
          // Create sharp instance with error handling
          const image = sharp(originalPath)
          
          // Get image metadata to check orientation
          const metadata = await image.metadata()
          
          // Resize image maintaining aspect ratio
          await image
            .rotate() // Auto-rotate based on EXIF orientation
            .resize(size, size, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ 
              quality: size <= 150 ? 75 : 85,
              progressive: true
            })
            .toFile(thumbnailFullPath)

          // Store relative path for database
          const key = `thumbnail_${size}` as keyof ThumbnailPaths
          thumbnailPaths[key] = relativePath
          
          console.log(`✅ Generated ${size}px thumbnail: ${relativePath}`)
          
        } catch (error) {
          console.error(`❌ Failed to generate ${size}px thumbnail for ${filename}:`, error)
          // Continue with other sizes even if one fails
        }
      }

      return thumbnailPaths
      
    } catch (error) {
      console.error(`❌ Thumbnail generation failed for ${filename}:`, error)
      return {}
    }
  }

  /**
   * Ensure all thumbnail directories exist
   */
  private async ensureThumbnailDirectories(): Promise<void> {
    const sizes = ['150', '500', '1200']
    
    for (const size of sizes) {
      const dir = path.join(this.thumbnailPath, size)
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
        console.log(`📁 Created thumbnail directory: ${dir}`)
      }
    }
  }

  /**
   * Check if image file is supported
   */
  isImageSupported(filename: string): boolean {
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif']
    const ext = path.extname(filename).toLowerCase()
    return supportedExtensions.includes(ext)
  }

  /**
   * Cleanup old thumbnails for a file
   */
  async cleanupThumbnails(filename: string): Promise<void> {
    const sizes = ['150', '500', '1200']
    const ext = path.extname(filename)
    const baseName = path.basename(filename, ext)

    for (const size of sizes) {
      const thumbnailFilename = `${baseName}_${size}${ext}`
      const thumbnailPath = path.join(this.thumbnailPath, size, thumbnailFilename)
      
      try {
        await fs.unlink(thumbnailPath)
        console.log(`🗑️ Cleaned up thumbnail: ${thumbnailPath}`)
      } catch {
        // File didn't exist, that's fine
      }
    }
  }

  /**
   * Generate thumbnails for multiple files in batch
   */
  async batchGenerateThumbnails(files: Array<{ path: string, filename: string }>): Promise<Map<string, ThumbnailPaths>> {
    const results = new Map<string, ThumbnailPaths>()
    
    console.log(`🔄 Starting batch thumbnail generation for ${files.length} files...`)
    
    for (const file of files) {
      if (this.isImageSupported(file.filename)) {
        const thumbnails = await this.generateThumbnails(file.path, file.filename)
        results.set(file.filename, thumbnails)
      } else {
        console.log(`⚠️ Skipping unsupported file: ${file.filename}`)
      }
    }
    
    console.log(`✅ Batch thumbnail generation complete. Generated thumbnails for ${results.size} files.`)
    return results
  }
}

// Export default instance
export const thumbnailGenerator = new ThumbnailGenerator()

// Helper function for use in API routes
export async function generateThumbnailsForFile(originalPath: string, filename: string): Promise<ThumbnailPaths> {
  return thumbnailGenerator.generateThumbnails(originalPath, filename)
}