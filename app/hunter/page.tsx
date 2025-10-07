'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { HunterGallery } from './components/HunterGallery'
import { HunterSearch } from './components/HunterSearch'
import { ThumbnailGeneratorPanel } from './components/ThumbnailGeneratorPanel'

export default function HunterMemorialPage() {
  const [searchFilters, setSearchFilters] = useState<any>({})
  const [viewMode, setViewMode] = useState<'gallery' | 'search'>('gallery')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  useEffect(() => {
    if (selectedYear) {
      setSearchFilters(prev => ({ ...prev, year: selectedYear }))
    } else {
      setSearchFilters(prev => {
        const { year, ...rest } = prev
        return rest
      })
    }
  }, [selectedYear])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <Image
                src="/images/hunter_memorial.jpg"
                alt="Hunter the Dobermann"
                width={400}
                height={400}
                className="rounded-full border-4 border-blue-500 shadow-xl"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Hunter's Memory Garden 🐾
              </h1>
              <p className="text-xl text-gray-300 mb-4">
                Celebrating the life of our beloved Boy-Boy
              </p>
              <p className="text-gray-400 max-w-2xl">
                A collection of precious moments, adventures, and memories.
                Hunter brought joy, loyalty, and unconditional love to our family, and he still does.
                His spirit lives on in every photo and video captured here.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('gallery')}
              className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'gallery'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Gallery View
            </button>
            <button
              onClick={() => setViewMode('search')}
              className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Search & Filter
            </button>
          </div>
          <Link
            href="/hunter/admin"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Family Admin
          </Link>
        </div>
      </div>

      {/* Year Filter Row */}
      {viewMode === 'gallery' && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 text-sm font-medium mr-2">Filter by year:</span>
            <button
              onClick={() => setSelectedYear(null)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${selectedYear === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              All
            </button>
            {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${selectedYear === year
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {viewMode === 'gallery' ? (
          <HunterGallery filters={searchFilters} />
        ) : (
          <HunterSearch onFiltersChange={setSearchFilters} />
        )}
      </div>
    </div>
  )
}
