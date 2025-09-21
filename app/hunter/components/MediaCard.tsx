'use client'

import { MediaFile } from '../../../lib/hunterMedia'

interface MediaCardProps {
  media: MediaFile
  onClick: () => void
}

export function MediaCard({ media, onClick }: MediaCardProps) {
  const formatDate = (date: string | Date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-800 aspect-square"
    >
      {/* Thumbnail */}
      {media.media_type === 'image' ? (
        <img
          src={`/api/hunter/files${media.thumbnail_150}`}
          alt={media.description || media.filename}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">🎥</div>
            <div className="text-xs text-gray-400">Video</div>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-xs text-white">
            {media.taken_at && (
              <div>{formatDate(media.taken_at)}</div>
            )}
            {media.location_name && (
              <div className="text-gray-300">{media.location_name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Video indicator */}
      {media.media_type === 'video' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-1">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.5 5.5v9l7-4.5-7-4.5z"/>
          </svg>
        </div>
      )}

      {/* Location indicator */}
      {media.location_lat && media.location_lng && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-60 rounded-full p-1">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
          </svg>
        </div>
      )}
    </div>
  )
}