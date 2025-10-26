'use client'

import { useState } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'
import { getOrientationStyle } from '../../../lib/imageOrientationUtils'

interface MediaModalProps {
  media: MediaFile
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

export function MediaModal({ media, onClose, onPrevious, onNext }: MediaModalProps) {
  const [isLoading, setIsLoading] = useState(true)

  const formatDate = (date: string | Date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Function to get the best quality source available
  const getMediaSource = (media: MediaFile) => {
    // For images, prefer original file, fallback to largest thumbnail
    if (media.media_type === 'image') {
      return `/api/hunter/files${media.file_path}`
    }
    
    // For videos, use the file path directly
    return `/api/hunter/files${media.file_path}`
  }

  // Get orientation styles for proper image rotation
  const orientationStyle = getOrientationStyle(media.orientation)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col lg:flex-row">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 lg:top-4 lg:right-4 z-10 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
      >
        ×
      </button>

      {/* Navigation buttons */}
      <button
        onClick={onPrevious}
        className="absolute left-2 top-1/2 lg:left-4 lg:top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
      >
        ←
      </button>

      <button
        onClick={onNext}
        className="absolute right-2 top-1/2 lg:right-4 lg:top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
      >
        →
      </button>

      {/* Media content */}
      <div className="flex-1 flex items-center justify-center min-h-0 lg:min-h-full">
        {media.media_type === 'image' ? (
          <img
            src={getMediaSource(media)}
            alt={media.description || media.filename}
            className="max-w-full max-h-full object-contain"
            style={orientationStyle}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              console.error('Image failed to load:', getMediaSource(media))
              setIsLoading(false)
            }}
          />
        ) : (
          <video
            src={getMediaSource(media)}
            controls
            className="max-w-full max-h-full"
            onLoadedData={() => setIsLoading(false)}
            onError={(e) => {
              console.error('Video failed to load:', getMediaSource(media), e)
              setIsLoading(false)
            }}
            preload="metadata"
          />
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Metadata section */}
      <div className="w-full lg:w-80 bg-gray-900 bg-opacity-95 p-4 lg:p-6 overflow-y-auto max-h-64 lg:max-h-full">
        <div className="space-y-4">
          {/* File info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {media.description || media.filename}
            </h3>
            <div className="text-sm text-gray-300 space-y-1">
              <div>📁 {media.filename}</div>
              {media.file_size && (
                <div>💾 {formatFileSize(media.file_size)}</div>
              )}
              <div>🎬 {media.media_type.toUpperCase()}</div>
              {media.orientation && media.orientation !== 1 && (
                <div>🔄 Orientation: {media.orientation}</div>
              )}
            </div>
          </div>

          {/* Date */}
          {(media.taken_at || media.uploaded_at) && (
            <div>
              <h4 className="font-medium text-white mb-1">Date</h4>
              <div className="text-sm text-gray-300">
                📅 {formatDate(media.taken_at || media.uploaded_at || '')}
              </div>
            </div>
          )}

          {/* Location */}
          {(media.location_name || (media.location_lat && media.location_lng)) && (
            <div>
              <h4 className="font-medium text-white mb-1">Location</h4>
              <div className="text-sm text-gray-300">
                {media.location_name && (
                  <div>📍 {media.location_name}</div>
                )}
                {media.location_lat && media.location_lng && (
                  <div className="text-xs mt-1">
                    GPS: {media.location_lat.toFixed(6)}, {media.location_lng.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera */}
          {(media.camera || (media.camera_make && media.camera_model)) && (
            <div>
              <h4 className="font-medium text-white mb-1">Camera</h4>
              <div className="text-sm text-gray-300">
                📷 {media.camera || `${media.camera_make} ${media.camera_model}`}
              </div>
            </div>
          )}

          {/* Tags */}
          {media.tags && media.tags.length > 0 && (
            <div>
              <h4 className="font-medium text-white mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {media.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                  >
                    {tag.tag_value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}