// frontend/app/components/CryptoNewsCard.tsx - Enhanced with dynamic text expansion
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
    const [isClient, setIsClient] = useState(false)
    const [isCommentExpanded, setIsCommentExpanded] = useState(false)

    // Fix hydration mismatch
    useEffect(() => {
        setIsClient(true)
    }, [])

    // Reset expansion state when news item changes
    useEffect(() => {
        setIsCommentExpanded(false)
    }, [currentNewsIndex])

    const fetchCryptoNews = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/crypto-news')

            if (!response.ok) {
                throw new Error(`Crypto news fetch failed: ${response.status}`)
            }

            const result: CryptoNewsResponse = await response.json()

            if (result.success && result.data && result.data.length > 0) {
                setAllNews(result.data)
                setCurrentNewsIndex(0) // Reset to first headline when fetching new data
                setLastFetched(result.lastUpdated)
                setError(null)
            } else {
                throw new Error(result.error || 'No crypto news available')
            }
        } catch (err) {
            console.error('Error fetching crypto news:', err)
            setError('Failed to load crypto news')
            // Don't clear existing news on error, just show error state
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

    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    // Enhanced function to handle hunter comment display
    const renderHunterComment = (comment: string) => {
        const CHARACTER_LIMIT = 120
        const isTruncated = comment.length > CHARACTER_LIMIT

        if (!isTruncated) {
            return (
                <p className="text-sm text-gray-300 italic leading-relaxed">
                    {comment}
                </p>
            )
        }

        return (
            <div className="space-y-1">
                <p className="text-sm text-gray-300 italic leading-relaxed">
                    {isCommentExpanded ? comment : truncateText(comment, CHARACTER_LIMIT)}
                </p>
                <button
                    onClick={() => setIsCommentExpanded(!isCommentExpanded)}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors duration-200 font-medium"
                >
                    {isCommentExpanded ? 'Show less' : 'Show more'}
                </button>
            </div>
        )
    }

    const currentNews = allNews[currentNewsIndex]
    const rotationInfo = allNews.length > 1 ? `${currentNewsIndex + 1}/${allNews.length}` : ''

    return (
        <div className="p-4 border border-orange-700 rounded-xl bg-gray-900 hover:border-orange-600 transition-colors duration-200 w-full">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-orange-400 font-semibold">🚀 Latest Crypto News</p>
                <div className="text-xs text-gray-500 text-right">
                    {rotationInfo && isClient && (
                        <div className="mb-1">Headlines {rotationInfo}</div>
                    )}
                    {lastFetched && isClient && (
                        <div>Fetched {formatTimeAgo(lastFetched)}</div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-4/5 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">News fetch unavailable</p>
                    <p className="text-xs text-gray-600 mb-3">
                        Hunter is having a rest 🐾
                    </p>
                    <button
                        onClick={fetchCryptoNews}
                        className="text-sm text-orange-400 hover:underline transition-colors"
                    >
                        Try again →
                    </button>
                </div>
            ) : currentNews ? (
                <div className="space-y-3">
                    <Link
                        href={currentNews.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-white hover:text-orange-400 transition-colors leading-tight block"
                    >
                        {truncateText(currentNews.headline, 80)}
                    </Link>

                    {/* Enhanced Hunter's comment with expansion */}
                    {renderHunterComment(currentNews.hunterComment)}

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                        <span className="capitalize">{currentNews.source}</span>
                        <div className="flex items-center gap-2">
                            {currentNews.score && (
                                <span className="text-orange-400">Score: {currentNews.score}</span>
                            )}
                            {isClient && (
                                <span>{formatTimeAgo(currentNews.timestamp)}</span>
                            )}
                        </div>
                    </div>

                    <Link
                        href={currentNews.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-orange-400 hover:underline transition-colors"
                    >
                        Read full article →
                    </Link>

                    {isClient && (
                        <div className="pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400 text-center">
                                Powered by Hunter's Nose for News 🐾
                                {allNews.length > 1 && lastRotated && (
                                    <span className="block mt-1">
                                        Next rotation in ~{Math.max(0, 15 - Math.floor((Date.now() - new Date(lastRotated || lastFetched).getTime()) / (1000 * 60)))}min
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">No crypto news available</p>
                    <p className="text-xs text-gray-600 mb-3">
                        Check back soon for fresh headlines 📰
                    </p>
                    <a
                        href="https://www.coindesk.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-orange-400 hover:underline"
                    >
                        Browse CoinDesk →
                    </a>
                </div>
            )}
        </div>
    )
}