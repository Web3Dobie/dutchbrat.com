'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { HunterGallery } from '../hunter/components/HunterGallery'
import { HunterSearch } from '../hunter/components/HunterSearch'

export default function HunterMemorialHomepage() {
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

                    {/* Year Filter */}
                    <div className="flex gap-2 items-center">
                        <label className="text-gray-400 text-sm">Filter by year:</label>
                        <select
                            value={selectedYear || ''}
                            onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-1 text-sm"
                        >
                            <option value="">All years</option>
                            <option value="2018">2018</option>
                            <option value="2019">2019</option>
                            <option value="2020">2020</option>
                            <option value="2021">2021</option>
                            <option value="2022">2022</option>
                            <option value="2023">2023</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
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