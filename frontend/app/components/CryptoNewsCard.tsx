// frontend/app/components/CryptoNewsCard.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CryptoNewsItem {
    headline: string
    url: string
    score?: number
    timestamp: string
    source: string
    hunterComment: string
}

interface CryptoNewsResponse {
    success: boolean
    data: CryptoNewsItem[]
    lastUpdated: string
    error?: string
}

export default function CryptoNewsCard() {
    const [allNews, setAllNews] = useState<CryptoNewsItem[]>([])
    const [currentNewsIndex, setCurrentNewsIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastFetched, setLastFetched] = useState<string>('')
    const [lastRotated, setLastRotated] = useState<string>('')

    const fetchCryptoNews = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/crypto-news')
            const result: CryptoNewsResponse = await response.json()

            if (result.success && result.data.length > 0) {
                setAllNews(result.data)
                setCurrentNewsIndex(0) // Reset to first headline when fetching new data
                setLastFetched(result.lastUpdated)
                setError(null)
            } else {
                setError(result.error || 'No crypto news available')
            }
        } catch (err) {
            setError('Network error while fetching crypto news')
            console.error('Crypto news fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const rotateToNextHeadline = () => {
        if (allNews.length > 1) {
            setCurrentNewsIndex((prev) => (prev + 1) % allNews.length)
            setLastRotated(new Date().toISOString())
        }
    }

    useEffect(() => {
        fetchCryptoNews()

        // Fetch new headlines every hour (to get top 4 from past hour)
        const fetchInterval = setInterval(fetchCryptoNews, 60 * 60 * 1000)

        return () => clearInterval(fetchInterval)
    }, [])

    useEffect(() => {
        // Rotate headlines every 15 minutes
        const rotateInterval = setInterval(rotateToNextHeadline, 15 * 60 * 1000)

        return () => clearInterval(rotateInterval)
    }, [allNews])

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date()
        const time = new Date(timestamp)
        const diffMs = now.getTime() - time.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))

        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        const diffDays = Math.floor(diffHours / 24)
        return `${diffDays}d ago`
    }

    const currentNews = allNews[currentNewsIndex]
    const rotationInfo = allNews.length > 1 ? `${currentNewsIndex + 1}/${allNews.length}` : ''

    const formatTimeAgoForNews = (timestamp: string): string => {
        const now = new Date()
        const time = new Date(timestamp)
        const diffMs = now.getTime() - time.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))

        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        const diffDays = Math.floor(diffHours / 24)
        return `${diffDays}d ago`
    }

    return (
        <div className="p-4 border border-orange-700 rounded-xl bg-gray-900">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-orange-400 font-semibold">🚀 Latest Crypto News</p>
                <div className="text-xs text-gray-500 text-right">
                    {rotationInfo && (
                        <div className="mb-1">Headlines {rotationInfo}</div>
                    )}
                    {lastFetched && (
                        <div>Fetched {formatTimeAgoForNews(lastFetched)}</div>
                    )}
                </div>
            </div>

            {loading ? (
                <p className="text-gray-500">Loading crypto news…</p>
            ) : error ? (
                <p className="text-red-400">Error: {error}</p>
            ) : currentNews ? (
                <div className="space-y-3">
                    <Link
                        href={currentNews.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-white hover:text-orange-400 transition-colors leading-tight block"
                    >
                        {currentNews.headline}
                    </Link>

                    {/* Hunter's comment */}
                    <p className="text-sm text-gray-300 italic">
                        {currentNews.hunterComment}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                        <span className="capitalize">{currentNews.source}</span>
                        <div className="flex items-center gap-2">
                            {currentNews.score && (
                                <span className="text-orange-400">Score: {currentNews.score}</span>
                            )}
                            <span>{formatTimeAgoForNews(currentNews.timestamp)}</span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-700">
                        <p className="text-xs text-gray-400 text-center">
                            Powered by Hunter's AI News Pipeline 🐾
                            {allNews.length > 1 && (
                                <span className="block mt-1">
                                    Next rotation in ~{15 - Math.floor((Date.now() - new Date(lastRotated || lastFetched).getTime()) / (1000 * 60))}min
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            ) : allNews.length === 0 ? (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">News fetch unavailable</p>
                    <p className="text-xs text-gray-600">
                        Hunter's news pipeline is taking a break 🐾
                    </p>
                </div>
            ) : (
                <p className="text-gray-500">No crypto news available.</p>
            )}
        </div>
    )
}