// frontend/app/components/HedgeFundNewsCard.tsx - Updated to match CryptoNewsCard styling
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HedgeFundNewsItem {
    headline: string
    url: string
    score?: number
    timestamp: string
    category: string
    source: string
    dutchbratComment: string
}

interface HedgeFundNewsResponse {
    success: boolean
    data: HedgeFundNewsItem[]
    lastUpdated: string
    categories: string[]
    error?: string
}

export default function HedgeFundNewsCard() {
    const [allNews, setAllNews] = useState<HedgeFundNewsItem[]>([])
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

    const fetchHedgeFundNews = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/hedgefund-news')

            if (!response.ok) {
                throw new Error(`HedgeFund news fetch failed: ${response.status}`)
            }

            const result: HedgeFundNewsResponse = await response.json()

            if (result.success && result.data && result.data.length > 0) {
                setAllNews(result.data)
                setCurrentNewsIndex(0) // Reset to first headline when fetching new data
                setLastFetched(result.lastUpdated)
                setError(null)
            } else {
                throw new Error(result.error || 'No hedge fund news available')
            }
        } catch (err) {
            console.error('Error fetching hedge fund news:', err)
            setError('Failed to load hedge fund news')
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
        fetchHedgeFundNews()

        // Fetch new headlines every 30 minutes to match backend headline collection
        // Backend collects: 30min headlines (score≥7, limit=6) + 1hr headlines (score≥6, limit=10)
        const fetchInterval = setInterval(fetchHedgeFundNews, 30 * 60 * 1000)

        return () => clearInterval(fetchInterval)
    }, [])

    useEffect(() => {
        // Dynamic rotation based on available headlines - matches backend rotation logic
        // Backend rotates based on max(headlines_30min, headlines_1hr, 1)
        const rotateInterval = setInterval(rotateToNextHeadline, 5 * 60 * 1000) // 5 minutes to match backend

        return () => clearInterval(rotateInterval)
    }, [allNews])

    // Helper functions
    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength).trim() + '...'
    }

    const formatTimeAgo = (timestamp: string) => {
        if (!isClient) return ''

        try {
            const now = new Date()
            const then = new Date(timestamp)
            const diffMs = now.getTime() - then.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMins / 60)

            if (diffMins < 60) {
                return `${diffMins}m ago`
            } else if (diffHours < 24) {
                return `${diffHours}h ago`
            } else {
                return then.toLocaleDateString()
            }
        } catch (e) {
            return ''
        }
    }

    const getCategoryIcon = (category: string) => {
        const icons = {
            'macro': '📊',
            'equity': '💼',
            'political': '🏛️'
        }
        return icons[category as keyof typeof icons] || '📈'
    }

    const getCategoryColor = (category: string) => {
        const colors = {
            'macro': 'text-blue-400',
            'equity': 'text-green-400',
            'political': 'text-red-400'
        }
        return colors[category as keyof typeof colors] || 'text-gray-400'
    }

    const renderDutchBratComment = (comment: string) => {
        const maxCommentLength = 120
        const shouldExpand = comment.length > maxCommentLength

        if (!shouldExpand) {
            return (
                <p className="text-sm text-gray-300 leading-relaxed">
                    {comment}
                </p>
            )
        }

        return (
            <div className="space-y-2">
                <p className="text-sm text-gray-300 leading-relaxed">
                    {isCommentExpanded ? comment : truncateText(comment, maxCommentLength)}
                </p>
                <button
                    onClick={() => setIsCommentExpanded(!isCommentExpanded)}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                    {isCommentExpanded ? 'Show less' : 'Show more'} →
                </button>
            </div>
        )
    }

    const currentNews = allNews[currentNewsIndex]
    const rotationInfo = allNews.length > 1 ? `${currentNewsIndex + 1}/${allNews.length}` : ''

    return (
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900 hover:border-purple-600 transition-colors duration-200 w-full">
            {/* Header - Updated to match CryptoNewsCard pattern */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-purple-400 font-semibold">📊 Important Headlines</p>
                <div className="text-xs text-gray-500 text-right">
                    {rotationInfo && isClient && (
                        <div className="mb-1">Headlines {rotationInfo}</div>
                    )}
                    {lastFetched && isClient && (
                        <div>Fetched {formatTimeAgo(lastFetched)}</div>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-4/5 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">Scanning for Important News</p>
                    <p className="text-xs text-gray-600 mb-3">
                        HTD Research is analyzing market conditions
                    </p>
                    <button
                        onClick={fetchHedgeFundNews}
                        className="text-sm text-purple-400 hover:underline transition-colors"
                    >
                        Try again →
                    </button>
                </div>
            ) : currentNews ? (
                <div className="space-y-3">
                    {/* Category Badge */}
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${getCategoryColor(currentNews.category)}`}>
                            {getCategoryIcon(currentNews.category)} {currentNews.category.toUpperCase()}
                        </span>
                        {currentNews.score && (
                            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded">
                                Score: {currentNews.score}
                            </span>
                        )}
                    </div>

                    {/* Headline */}
                    <Link
                        href={currentNews.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-white hover:text-purple-400 transition-colors leading-tight block"
                    >
                        {truncateText(currentNews.headline, 100)}
                    </Link>

                    {/* DutchBrat's Comment */}
                    <div className="bg-gray-800/50 rounded-lg p-3 border-l-4 border-purple-500">
                        {renderDutchBratComment(currentNews.dutchbratComment)}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                        <span className="capitalize font-medium">{currentNews.source}</span>
                        {isClient && (
                            <span>{formatTimeAgo(currentNews.timestamp)}</span>
                        )}
                    </div>

                    {/* Read More Link */}
                    <Link
                        href={currentNews.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-purple-400 hover:underline transition-colors"
                    >
                        Read full article →
                    </Link>

                    {/* Footer section matching CryptoNewsCard pattern */}
                    {isClient && (
                        <div className="pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400 text-center">
                                HTD Research - AI Driven Institutional Analysis 📈
                                {allNews.length > 1 && lastRotated && (
                                    <span className="block mt-1">
                                        Next headline in {Math.ceil((5 * 60 * 1000 - (Date.now() - new Date(lastRotated).getTime())) / 60000)}m
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">Waiting for important news to break</p>
                    <p className="text-xs text-gray-600">
                        HTD Research is analyzing market conditions 📊
                    </p>
                </div>
            )}
        </div>
    )
}