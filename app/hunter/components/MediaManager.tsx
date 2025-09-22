// app/hunter/components/MediaManager.tsx - Complete Enhanced Version
'use client'

import { useState, useEffect } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'
import { TagEditor } from './TagEditor'
import { DeleteConfirmationModal } from './DeleteConfirmationModal'

interface MediaManagerProps {
  onStatsUpdate: () => void
}

export function MediaManager({ onStatsUpdate }: MediaManagerProps) {
  const [media, setMedia] = useState<MediaFile[]>([])
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Delete functionality state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [mediaToDelete, setMediaToDelete] = useState<MediaFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean
    message: string
    errors?: string[]
  } | null>(null)

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

  // Delete functionality
  const handleDeleteClick = (mediaItem: MediaFile) => {
    setMediaToDelete(mediaItem)
    setShowDeleteModal(true)
    setDeleteResult(null)
  }

  const handleDeleteConfirm = async () => {
    if (!mediaToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/hunter/media/${mediaToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmationPhrase: 'DELETE HUNTER PHOTO PERMANENTLY',
          userConfirmed: true
        })
      })

      const result = await response.json()

      if (result.success) {
        // Remove from local state
        setMedia(prev => prev.filter(m => m.id !== mediaToDelete.id))
        
        // Clear selection if deleted media was selected
        if (selectedMedia?.id === mediaToDelete.id) {
          setSelectedMedia(null)
        }

        setDeleteResult({
          success: true,
          message: `Successfully deleted ${mediaToDelete.filename}`
        })

        // Update stats
        onStatsUpdate()
      } else {
        setDeleteResult({
          success: false,
          message: result.message || 'Deletion failed',
          errors: result.errors
        })
      }

    } catch (error) {
      console.error('Delete error:', error)
      setDeleteResult({
        success: false,
        message: 'Network error during deletion',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteModalClose = () => {
    if (!isDeleting) {
      setShowDeleteModal(false)
      setMediaToDelete(null)
      // Keep delete result visible for a few seconds
      if (deleteResult) {
        setTimeout(() => setDeleteResult(null), 5000)
      }
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Delete Result Toast */}
      {deleteResult && (
        <div className={`p-4 rounded-lg border ${
          deleteResult.success 
            ? 'bg-green-900/50 border-green-700 text-green-200' 
            : 'bg-red-900/50 border-red-700 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {deleteResult.success ? '✅' : '❌'}
            </span>
            <span className="font-semibold">{deleteResult.message}</span>
          </div>
          {deleteResult.errors && deleteResult.errors.length > 0 && (
            <div className="mt-2 text-sm">
              <p>Errors encountered:</p>
              <ul className="list-disc list-inside ml-4">
                {deleteResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedMedia?.id === item.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                    {item.thumbnail_150 ? (
                      <img
                        src={`/api/hunter/files/${item.thumbnail_150}`}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `/api/hunter/files/${item.file_path}`
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        {item.media_type === 'video' ? '🎥' : '📷'}
                      </div>
                    )}
                  </div>

                  {/* Info - clickable area */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedMedia(item)}
                  >
                    <div className="font-medium truncate">
                      {item.description || item.filename}
                    </div>
                    <div className="text-sm opacity-75">
                      {item.taken_at
                        ? new Date(item.taken_at).toLocaleDateString()
                        : 'No date'
                      }
                      {item.location_name && ` • ${item.location_name}`}
                    </div>
                    {/* Tags */}
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
                          <span className="text-xs opacity-75">
                            +{item.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(item)
                    }}
                    className="flex-shrink-0 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center transition-colors group"
                    title="Delete permanently"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Media Editor */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
          {selectedMedia ? (
            <div className="space-y-4">
              {/* Selected Media Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit Media</h3>
                <button
                  onClick={() => handleDeleteClick(selectedMedia)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                >
                  🗑️ Delete
                </button>
              </div>

              {/* Tag Editor Component */}
              <TagEditor
                media={selectedMedia}
                onUpdate={handleMediaUpdate}
              />
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              Select a media file to edit its details and tags
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && mediaToDelete && (
        <DeleteConfirmationModal
          media={mediaToDelete}
          isOpen={showDeleteModal}
          onClose={handleDeleteModalClose}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}