// app/hunter/components/HunterSearch.tsx
'use client'

import { useState, useEffect } from 'react'
import { HunterGallery } from './HunterGallery'

interface HunterSearchProps {
  onFiltersChange: (filters: any) => void
}

export function HunterSearch({ onFiltersChange }: HunterSearchProps) {
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    hasLocation: false,
    tags: [] as string[]
  })

  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    fetchAvailableTags()
  }, [])

  useEffect(() => {
    // Debounce filter changes
    const timeoutId = setTimeout(() => {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => {
          if (Array.isArray(value)) return value.length > 0
          if (typeof value === 'boolean') return value
          return value !== ''
        })
      )
      onFiltersChange(cleanFilters)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters, onFiltersChange])

  const fetchAvailableTags = async () => {
    try {
      const response = await fetch('/api/hunter/tags')
      const tags = await response.json()
      setAvailableTags(tags)
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const addTag = (tagValue: string) => {
    if (tagValue && !filters.tags.includes(tagValue)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tagValue]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagValue: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagValue)
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      search: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      hasLocation: false,
      tags: []
    })
    setTagInput('')
  }

  const tagSuggestions = availableTags
    .filter(tag =>
      tag.value.toLowerCase().includes(tagInput.toLowerCase()) &&
      !filters.tags.includes(tag.value)
    )
    .slice(0, 10)

  // Convert filters to the format expected by HunterGallery
  const galleryFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, value]) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'boolean') return value
      return value !== ''
    })
  )

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Search Hunter's Memories</h2>
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Clear all filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Text Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Keywords, descriptions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Media Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Media Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="image">Photos</option>
              <option value="video">Videos</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasLocation}
                onChange={(e) => setFilters(prev => ({ ...prev, hasLocation: e.target.checked }))}
                className="mr-2 rounded"
              />
              <span className="text-gray-300">Has GPS location</span>
            </label>
          </div>

          {/* Tags */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags
            </label>

            {/* Selected tags */}
            {filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {filters.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-sm rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-300 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Add tags (people, places, activities...)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(tagInput)
                  }
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Tag suggestions */}
              {tagInput && tagSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
                  {tagSuggestions.map(tag => (
                    <button
                      key={`${tag.type}-${tag.value}`}
                      onClick={() => addTag(tag.value)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors text-white first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span className="text-blue-400 text-xs uppercase mr-2">
                        {tag.type}
                      </span>
                      {tag.value}
                      <span className="text-gray-400 text-xs ml-2">
                        ({tag.count})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Results - Gallery */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Search Results</h3>
        <HunterGallery filters={galleryFilters} />
      </div>
    </div>
  )
}