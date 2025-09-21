// app/hunter/components/MediaManager.tsx - Fixed tags handling
'use client'

import { useState, useEffect } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'
import { TagEditor } from './TagEditor'

interface MediaManagerProps {
  onStatsUpdate: () => void
}

export function MediaManager({ onStatsUpdate }: MediaManagerProps) {
  const [media, setMedia] = useState<MediaFile[]>([])
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '100', // Show more in admin
        search: searchTerm
      })
      
      const response = await fetch(`/api/hunter/media?${params}`)
      const data = await response.json()
      setMedia(data.media)
    } catch (error) {
      console.error('Error fetching media:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMedia()
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleMediaUpdate = (updatedMedia: MediaFile) => {
    setMedia(prev => prev.map(m => m.id === updatedMedia.id ? updatedMedia : m))
    setSelectedMedia(updatedMedia)
    onStatsUpdate()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Media List */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Media Files</h2>
          <div className="text-sm text-gray-400">
            {media.length} files
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Media List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : media.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              No files found. Try scanning for new files first.
            </div>
          ) : (
            media.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedMedia?.id === item.id
                    ? 'bg-blue-600'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                  {item.media_type === 'image' && item.thumbnail_150 ? (
                    <img
                      src={`/api/hunter/files${item.thumbnail_150}`}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {item.media_type === 'video' ? '🎥' : '📷'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {item.description || item.filename}
                  </div>
                  <div className="text-sm text-gray-400">
                    {item.taken_at 
                      ? new Date(item.taken_at).toLocaleDateString()
                      : 'No date'
                    }
                    {item.location_name && ` • ${item.location_name}`}
                  </div>
                  {/* Fixed tags handling with proper null checking */}
                  {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded"
                        >
                          {tag.tag_value || tag.value || 'Unknown tag'}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{item.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Media Editor */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        {selectedMedia ? (
          <TagEditor
            media={selectedMedia}
            onUpdate={handleMediaUpdate}
          />
        ) : (
          <div className="text-center text-gray-400 py-8">
            Select a media file to edit its details and tags
          </div>
        )}
      </div>
    </div>
  )
}