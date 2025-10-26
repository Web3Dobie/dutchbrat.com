'use client'

import { useState, useEffect } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'
import { TagEditor } from './TagEditor'
import { getOrientationStyle } from '../../../lib/imageOrientationUtils'

interface DeleteResult {
  success: boolean
  message: string
  errors?: string[]
}

interface MediaManagerProps {
  onStatsUpdate: () => Promise<void>
}

export function MediaManager({ onStatsUpdate }: MediaManagerProps) {
  const [media, setMedia] = useState<MediaFile[]>([])
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit] = useState(20)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteStage, setDeleteStage] = useState<'confirm' | 'verify' | 'final'>('confirm')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null)

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/hunter/media?${params}`)
      if (!response.ok) throw new Error('Failed to fetch media')
      
      const data = await response.json()
      setMedia(data.media || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching media:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia()
  }, [offset, searchTerm])

  const handleScan = async () => {
    try {
      setScanning(true)
      setScanResult('')
      
      const response = await fetch('/api/hunter/media/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUser: 'system' })
      })

      if (!response.ok) throw new Error('Scan failed')
      
      const result = await response.json()
      setScanResult(`Scan completed! Processed ${result.files?.length || 0} new files.`)
      
      // Refresh the media list and dashboard stats
      fetchMedia()
      await onStatsUpdate()
    } catch (error) {
      console.error('Scan error:', error)
      setScanResult('Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMedia) return

    try {
      const response = await fetch(`/api/hunter/media/${selectedMedia.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      setDeleteResult({
        success: result.success,
        message: result.success 
          ? `Successfully deleted ${selectedMedia.filename}` 
          : `Failed to delete ${selectedMedia.filename}`,
        errors: result.errors
      })

      if (result.success) {
        setSelectedMedia(null)
        fetchMedia() // Refresh list
        await onStatsUpdate() // Update dashboard stats
      }
    } catch (error) {
      setDeleteResult({
        success: false,
        message: `Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: []
      })
    } finally {
      setShowDeleteConfirm(false)
      setDeleteStage('confirm')
      setDeleteConfirmText('')
    }
  }

  const resetDeleteDialog = () => {
    setShowDeleteConfirm(false)
    setDeleteStage('confirm')
    setDeleteConfirmText('')
    setDeleteResult(null)
  }

  const filteredMedia = media

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media Manager</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {scanning ? 'Scanning...' : 'Scan for New Files'}
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 p-4 rounded-lg">
          {scanResult}
        </div>
      )}

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
              {media.length} of {total} files
              {searchTerm && ` (filtered)`}
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
                {searchTerm ? 'No files found matching your search.' : 'No files found. Try scanning for new files first.'}
              </div>
            ) : (
              <>
                {media.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedMedia?.id === item.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {/* Thumbnail with orientation support */}
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.thumbnail_150 ? (
                        <img
                          src={`/api/hunter/files/${item.thumbnail_150}`}
                          alt={item.filename}
                          className="w-full h-full object-cover"
                          style={getOrientationStyle(item.orientation)}
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
                          : new Date(item.uploaded_at || '').toLocaleDateString()
                        }
                        {item.orientation && item.orientation !== 1 && (
                          <span className="ml-2 text-xs bg-blue-500 px-1 rounded">
                            ↻{item.orientation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1 bg-gray-700 text-sm rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-400">
                    {offset + 1}-{Math.min(offset + limit, total)} of {total}
                  </span>
                  
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="px-3 py-1 bg-gray-700 text-sm rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="bg-gray-900 rounded-xl border border-gray-700">
          {selectedMedia ? (
            <TagEditor 
              media={selectedMedia} 
              onUpdate={(updatedMedia) => {
                setSelectedMedia(updatedMedia)
                fetchMedia() // Refresh the list to show updates
              }}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          ) : (
            <div className="p-6 text-center text-gray-400">
              Select a media file to edit its metadata and tags
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full mx-4">
            
            {deleteStage === 'confirm' && (
              <>
                <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Delete Media File</h3>
                <p className="text-gray-300 mb-4">
                  Are you sure you want to delete <strong>{selectedMedia.filename}</strong>?
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  This will permanently delete the file, all thumbnails, and associated metadata. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStage('verify')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={resetDeleteDialog}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {deleteStage === 'verify' && (
              <>
                <h3 className="text-lg font-semibold text-red-400 mb-4">🔒 Verification Required</h3>
                <p className="text-gray-300 mb-4">
                  To confirm deletion, please type the filename exactly:
                </p>
                <p className="text-yellow-400 font-mono text-sm mb-4 bg-gray-700 p-2 rounded">
                  {selectedMedia.filename}
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type filename here..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-6 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStage('final')}
                    disabled={deleteConfirmText !== selectedMedia.filename}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Proceed to Final Step
                  </button>
                  <button
                    onClick={resetDeleteDialog}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {deleteStage === 'final' && (
              <>
                <h3 className="text-lg font-semibold text-red-400 mb-4">💀 FINAL WARNING</h3>
                <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg mb-4">
                  <p className="text-red-200 font-semibold">PERMANENT DELETION</p>
                  <p className="text-red-300 text-sm mt-1">
                    This will immediately and permanently delete:
                  </p>
                  <ul className="text-red-300 text-sm mt-2 ml-4 list-disc">
                    <li>Original file: {selectedMedia.filename}</li>
                    <li>All thumbnail versions</li>
                    <li>All metadata and tags</li>
                    <li>Database records</li>
                  </ul>
                </div>
                <p className="text-gray-300 text-sm mb-6">
                  This action is irreversible. The file will be gone forever.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors font-semibold"
                  >
                    DELETE PERMANENTLY
                  </button>
                  <button
                    onClick={resetDeleteDialog}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}