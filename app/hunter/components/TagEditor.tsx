// app/hunter/components/TagEditor.tsx
'use client'

import { useState, useEffect } from 'react'
import { MediaFile } from '../../../lib/hunterMedia'

interface TagEditorProps {
  media: MediaFile
  onUpdate: (updatedMedia: MediaFile) => void
}

export function TagEditor({ media, onUpdate }: TagEditorProps) {
  const [description, setDescription] = useState(media.description || '')
  const [locationName, setLocationName] = useState(media.location_name || '')
  const [newTag, setNewTag] = useState({ type: 'person', value: '' })
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [tagSuggestions, setTagSuggestions] = useState<any[]>([])

  useEffect(() => {
    setDescription(media.description || '')
    setLocationName(media.location_name || '')
    fetchAvailableTags()
  }, [media])

  useEffect(() => {
    // Get suggestions for current tag type and input
    if (newTag.value) {
      const suggestions = availableTags
        .filter(tag =>
          tag.type === newTag.type &&
          tag.value.toLowerCase().includes(newTag.value.toLowerCase()) &&
          !media.tags?.some((mediaTag: any) => mediaTag.value === tag.value)
        )
        .slice(0, 5)
      setTagSuggestions(suggestions)
    } else {
      setTagSuggestions([])
    }
  }, [newTag, availableTags, media.tags])

  const fetchAvailableTags = async () => {
    try {
      const response = await fetch('/api/hunter/tags')
      const tags = await response.json()
      setAvailableTags(tags)
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const handleSaveBasicInfo = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/hunter/media/${media.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim() || null,
          location_name: locationName.trim() || null
        })
      })

      if (response.ok) {
        const updatedMedia = await response.json()
        onUpdate(updatedMedia)
      }
    } catch (error) {
      console.error('Error updating media:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = async (tagValue?: string) => {
    const valueToAdd = tagValue || newTag.value.trim()
    if (!valueToAdd) return

    try {
      const response = await fetch('/api/hunter/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: media.id,
          tagType: newTag.type,
          tagValue: valueToAdd
        })
      })

      if (response.ok) {
        // Refresh media data
        const mediaResponse = await fetch(`/api/hunter/media?limit=1&offset=0`)
        const data = await mediaResponse.json()
        const updatedMedia = data.media.find((m: MediaFile) => m.id === media.id)
        if (updatedMedia) {
          onUpdate(updatedMedia)
        }

        setNewTag({ ...newTag, value: '' })
        setTagSuggestions([])
        fetchAvailableTags() // Refresh available tags
      }
    } catch (error) {
      console.error('Error adding tag:', error)
    }
  }

  const handleRemoveTag = async (tagType: string, tagValue: string) => {
    try {
      const response = await fetch('/api/hunter/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: media.id,
          tagType,
          tagValue
        })
      })

      if (response.ok) {
        // Refresh media data
        const mediaResponse = await fetch(`/api/hunter/media?limit=1&offset=0`)
        const data = await mediaResponse.json()
        const updatedMedia = data.media.find((m: MediaFile) => m.id === media.id)
        if (updatedMedia) {
          onUpdate(updatedMedia)
        }
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

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

  const tagTypeOptions = [
    { value: 'person', label: 'Person', icon: '👤' },
    { value: 'dog', label: 'Dog Friend', icon: '🐕' },
    { value: 'activity', label: 'Activity', icon: '🎾' },
    { value: 'location', label: 'Location', icon: '📍' },
    { value: 'mood', label: 'Mood', icon: '😊' }
  ]

  const getTagIcon = (type: string) => {
    const option = tagTypeOptions.find(opt => opt.value === type)
    return option?.icon || '🏷️'
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Edit Media Details</h3>

      {/* Preview */}
      <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
        <div className="w-20 h-20 bg-gray-700 rounded overflow-hidden flex-shrink-0">
          {media.media_type === 'image' ? (
            <img
              src={`/api/hunter/files${media.thumbnail_150 || media.file_path}`}
              alt={media.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
              {media.media_type === 'video' ? '🎥' : '📷'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="font-medium text-white">{media.filename}</div>
          <div className="text-sm text-gray-400">
            <p className="text-white">{formatDate(media.taken_at || media.uploaded_at || media.created_at || '')}</p>
          </div>
          <div className="text-sm text-gray-400">
            {formatFileSize(media.file_size || 0)} • {media.media_type.toUpperCase()}
          </div>
          {(media.camera || (media.camera_make && media.camera_model)) && (
            <div className="text-sm text-gray-400">
              📷 {media.camera || `${media.camera_make} ${media.camera_model}`}
            </div>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this memory..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Location Name
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Beach, Park, Home..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {media.location_lat && media.location_lng && (
            <div className="text-xs text-gray-400 mt-1">
              GPS: {media.location_lat.toFixed(6)}, {media.location_lng.toFixed(6)}
            </div>
          )}
        </div>

        <button
          onClick={handleSaveBasicInfo}
          disabled={saving}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Description & Location'}
        </button>
      </div>

      {/* Tags Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-white">Tags</h4>

        {/* Existing Tags */}
        {media.tags && media.tags.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Current tags:</div>
            <div className="flex flex-wrap gap-2">
              {media.tags.map((tag: any, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
                >
                  <span className="mr-1">{getTagIcon(tag.type)}</span>
                  {tag.value}
                  <button
                    onClick={() => handleRemoveTag(tag.type, tag.value)}
                    className="ml-2 text-blue-300 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add New Tag */}
        <div className="space-y-3">
          <div className="text-sm text-gray-400">Add new tag:</div>

          {/* Tag Type Selector */}
          <div className="grid grid-cols-5 gap-1">
            {tagTypeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setNewTag({ ...newTag, type: option.value })}
                className={`p-2 text-xs rounded-lg transition-colors ${newTag.type === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                <div>{option.icon}</div>
                <div>{option.label}</div>
              </button>
            ))}
          </div>

          {/* Tag Value Input */}
          <div className="relative">
            <input
              type="text"
              value={newTag.value}
              onChange={(e) => setNewTag({ ...newTag, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder={`Enter ${newTag.type}...`}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Tag Suggestions */}
            {tagSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
                {tagSuggestions.map(suggestion => (
                  <button
                    key={suggestion.value}
                    onClick={() => handleAddTag(suggestion.value)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors text-white first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className="mr-1">{getTagIcon(suggestion.type)}</span>
                    {suggestion.value}
                    <span className="text-gray-400 text-xs ml-2">
                      (used {suggestion.count} times)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleAddTag()}
            disabled={!newTag.value.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Add {getTagIcon(newTag.type)} {tagTypeOptions.find(opt => opt.value === newTag.type)?.label}
          </button>
        </div>
      </div>

      {/* Quick Tag Examples */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-300 mb-2">Quick tag ideas:</div>
        <div className="text-xs text-gray-400 space-y-1">
          <div><strong>People:</strong> Mom, Dad, Grandma, Uncle John...</div>
          <div><strong>Dog Friends:</strong> Max, Bella, Charlie, Buddy...</div>
          <div><strong>Activities:</strong> Playing fetch, Swimming, Walking, Sleeping, Eating...</div>
          <div><strong>Locations:</strong> Beach, Dog park, Garden, Living room...</div>
          <div><strong>Moods:</strong> Happy, Playful, Sleepy, Alert, Excited...</div>
        </div>
      </div>
    </div>
  )
}