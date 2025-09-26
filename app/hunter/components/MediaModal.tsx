'use client'

import { useState, useEffect } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'

interface MediaModalProps {
  media: MediaFile
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
}

export function MediaModal({ media, onClose, onNext, onPrevious }: MediaModalProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrevious()
      if (e.key === 'ArrowRight') onNext()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrevious])

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Date unknown'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
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

  // Helper function to get the correct media source URL
  // Helper function to get the correct media source URL
  const getMediaSource = (mediaItem: MediaFile) => {
    if (mediaItem.media_type === 'video') { // <-- The 'if' was missing here
      // For videos: use the new Nginx static file serving
      return `/media${mediaItem.file_path}`;
    } else {
      // For images: continue using the API route for thumbnails and security
      return `/api/hunter/files${mediaItem.thumbnail_1200 || mediaItem.file_path}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2 lg:p-4">
      <div className="relative w-full h-full max-w-7xl flex flex-col lg:flex-row">

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
          <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4 text-white">
            {media.description || 'Hunter Memory'}
          </h3>

          <div className="space-y-3 lg:space-y-4 text-xs lg:text-sm">

            {/* Date */}
            <div>
              <label className="text-gray-400 block mb-1">Date taken</label>
              <p className="text-white">{formatDate(media.taken_at || media.uploaded_at || media.created_at || '')}</p>
            </div>

            {/* Location */}
            {(media.location_name || (media.location_lat && media.location_lng)) && (
              <div>
                <label className="text-gray-400 block mb-1">Location</label>
                <p className="text-white">
                  {media.location_name || `${media.location_lat?.toFixed(6)}, ${media.location_lng?.toFixed(6)}`}
                </p>
              </div>
            )}

            {/* Camera info */}
            {(media.camera || (media.camera_make && media.camera_model)) && (
              <div>
                <label className="text-gray-400 block mb-1">Camera</label>
                <p className="text-white">
                  {media.camera || `${media.camera_make} ${media.camera_model}`}
                </p>
              </div>
            )}

            {/* Tags */}
            {media.tags && media.tags.length > 0 && (
              <div>
                <label className="text-gray-400 block mb-1">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {media.tags.map((tag: any, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                    >
                      {tag.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* File info */}
            <div>
              <label className="text-gray-400 block mb-1">File details</label>
              <p className="text-white text-xs">
                {media.filename}<br />
                {formatFileSize(media.file_size || 0)}<br />
                {media.media_type.toUpperCase()}
                {media.media_type === 'video' && (
                  <><br /><span className="text-green-400">Static served</span></>
                )}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}