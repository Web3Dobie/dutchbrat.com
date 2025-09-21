'use client'

import { useState, useEffect } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'
import { MediaCard } from './MediaCard'
import { MediaModal } from './MediaModal'

interface HunterGalleryProps {
  filters: any
}

export function HunterGallery({ filters }: HunterGalleryProps) {
  const [media, setMedia] = useState<MediaFile[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 24

  const fetchMedia = async (loadMore = false) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (loadMore ? (page + 1) * pageSize : 0).toString(),
        ...filters
      })

      const response = await fetch(`/api/hunter/media?${params}`)
      const data = await response.json()

      if (loadMore) {
        setMedia(prev => [...prev, ...data.media])
        setPage(prev => prev + 1)
      } else {
        setMedia(data.media)
        setPage(0)
      }
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching media:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia()
  }, [filters])

  const hasMore = media.length < total

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 text-center">
        <p className="text-gray-400">
          {loading ? 'Loading...' : `${total} precious memories`}
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {media.map((item) => (
          <MediaCard
            key={item.id}
            media={item}
            onClick={() => setSelectedMedia(item)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => fetchMedia(true)}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Load More Memories'}
          </button>
        </div>
      )}

      {/* Modal */}
      {selectedMedia && (
        <MediaModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onNext={() => {
            const currentIndex = media.findIndex(m => m.id === selectedMedia.id)
            if (currentIndex < media.length - 1) {
              setSelectedMedia(media[currentIndex + 1])
            }
          }}
          onPrevious={() => {
            const currentIndex = media.findIndex(m => m.id === selectedMedia.id)
            if (currentIndex > 0) {
              setSelectedMedia(media[currentIndex - 1])
            }
          }}
        />
      )}
    </div>
  )
}