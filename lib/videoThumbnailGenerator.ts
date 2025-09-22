// File: lib/videoThumbnailGenerator.ts (NEW FILE)
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

export class VideoThumbnailGenerator {
  private readonly mediaPath: string
  private readonly thumbnailPath: string

  constructor(mediaPath = '/app/hunter-media') {
    this.mediaPath = mediaPath
    this.thumbnailPath = path.join(mediaPath, 'thumbnails')
  }

  /**
   * Generate video thumbnails using FFmpeg
   */
  async generateVideoThumbnails(videoPath: string, filename: string): Promise<{
    thumbnail_150?: string
    thumbnail_500?: string  
    thumbnail_1200?: string
  }> {
    try {
      // Ensure thumbnail directories exist
      await this.ensureThumbnailDirectories()

      const baseName = path.parse(filename).name
      const thumbnailPaths: { [key: string]: string } = {}
      const sizes = [150, 500, 1200]

      // First, extract a frame at 1 second (or 10% into video, whichever is smaller)
      const tempFramePath = path.join(this.thumbnailPath, 'temp', `${baseName}_temp.jpg`)
      await this.ensureDirectory(path.dirname(tempFramePath))

      // Get video duration first
      const duration = await this.getVideoDuration(videoPath)
      const extractTime = Math.min(1, duration * 0.1) // 1 second or 10% of video

      // Extract frame using FFmpeg
      const extractCommand = `ffmpeg -i "${videoPath}" -ss ${extractTime} -vframes 1 -q:v 2 "${tempFramePath}" -y`
      
      console.log(`🎬 Extracting frame from video: ${filename} at ${extractTime}s`)
      await execAsync(extractCommand)

      // Check if frame was extracted
      try {
        await fs.access(tempFramePath)
      } catch {
        throw new Error('Failed to extract video frame')
      }

      // Now resize the extracted frame to different sizes using Sharp
      const sharp = require('sharp')
      
      for (const size of sizes) {
        const thumbnailFilename = `${baseName}_${size}.jpg`
        const thumbnailFullPath = path.join(this.thumbnailPath, size.toString(), thumbnailFilename)
        const relativePath = `/thumbnails/${size}/${thumbnailFilename}`

        await this.ensureDirectory(path.dirname(thumbnailFullPath))

        // Resize using Sharp
        await sharp(tempFramePath)
          .resize(size, size, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: size <= 150 ? 80 : 85,
            progressive: true 
          })
          .toFile(thumbnailFullPath)

        thumbnailPaths[`thumbnail_${size}`] = relativePath
        console.log(`✅ Generated ${size}px thumbnail for video: ${filename}`)
      }

      // Clean up temp frame
      try {
        await fs.unlink(tempFramePath)
      } catch (error) {
        console.warn(`⚠️ Could not clean up temp frame: ${error}`)
      }

      return thumbnailPaths

    } catch (error) {
      console.error(`❌ Video thumbnail generation failed for ${filename}:`, error)
      throw error
    }
  }

  /**
   * Get video duration in seconds
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    try {
      const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`
      const { stdout } = await execAsync(command)
      const duration = parseFloat(stdout.trim())
      return isNaN(duration) ? 10 : duration // Default to 10 seconds if can't determine
    } catch (error) {
      console.warn(`⚠️ Could not determine video duration for ${videoPath}:`, error)
      return 10 // Default fallback
    }
  }

  /**
   * Check if FFmpeg is available
   */
  async isFFmpegAvailable(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version')
      return true
    } catch {
      return false
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Ensure all thumbnail directories exist
   */
  private async ensureThumbnailDirectories(): Promise<void> {
    const sizes = ['150', '500', '1200', 'temp']
    
    for (const size of sizes) {
      const dirPath = path.join(this.thumbnailPath, size)
      await this.ensureDirectory(dirPath)
    }
  }
}

// Export singleton instance
export const videoThumbnailGenerator = new VideoThumbnailGenerator()