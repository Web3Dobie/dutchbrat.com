// frontend/app/components/LatestBriefingCard.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Briefing {
    id: string
    title: string
    period: string
    date: string
    pageUrl: string // Changed from pdfUrl
    tweetUrl?: string
    marketSentiment?: string
}

export default function LatestBriefingCard() {
    const [briefing, setBriefing] = useState<Briefing | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)

    // Fix hydration mismatch by ensuring client-side rendering
    useEffect(() => {
        setIsClient(true)
    }, [])

    const fetchLatestBriefing = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/latest-briefing')

            if (!response.ok) {
                throw new Error(`Briefing fetch failed: ${response.status}`)
            }

            const briefingData: Briefing = await response.json()
            setBriefing(briefingData)
        } catch (err) {
            console.error('Error fetching latest briefing:', err)
            setError('Failed to load latest briefing')
        } finally {
            setLoading(false)
        }
    }

    const formatBriefingDate = (dateString: string): string => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatPeriod = (period: string): string => {
        if (!period) return ''
        // Capitalize and make it more readable
        return period.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    useEffect(() => {
        fetchLatestBriefing()

        // Refresh data every 5 minutes
        const interval = setInterval(fetchLatestBriefing, 5 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900 hover:border-gray-600 transition-colors duration-200 w-full">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400 font-semibold">📊 Latest Briefing</p>
                {briefing && isClient && (
                    <p className="text-xs text-gray-500">
                        {formatBriefingDate(briefing.date)}
                    </p>
                )}
            </div>

            {loading ? (
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">Failed to load briefing</p>
                    <button
                        onClick={fetchLatestBriefing}
                        className="text-sm text-blue-400 hover:underline transition-colors"
                    >
                        Try again →
                    </button>
                </div>
            ) : briefing ? (
                <div className="space-y-3">
                    <Link
                        href={`/briefings?briefingId=${briefing.id}`}
                        className="text-base font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors leading-tight block"
                    >
                        {truncateText(briefing.title, 80)}
                    </Link>

                    <div className="text-sm text-blue-400">
                        {formatPeriod(briefing.period)} Market Analysis
                    </div>

                    {/* Market Sentiment Section */}
                    {briefing.marketSentiment && (
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 mt-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-blue-400">💭 Market Sentiment</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                {truncateText(briefing.marketSentiment, 150)}
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Link
                            href={`/briefings?briefingId=${briefing.id}`}
                            className="inline-block text-sm text-blue-400 hover:underline transition-colors"
                        >
                            📄 Read Briefing →
                        </Link>

                        {briefing.tweetUrl && (
                            <Link
                                href={briefing.tweetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-sm text-blue-400 hover:underline transition-colors"
                            >
                                🐦 View Tweet →
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">No briefings available</p>
                    <p className="text-xs text-gray-600">
                        Check back soon for fresh analysis 📊
                    </p>
                </div>
            )}
        </div>
    )
}