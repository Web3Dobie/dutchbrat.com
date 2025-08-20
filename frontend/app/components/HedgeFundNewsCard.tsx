// frontend/app/components/HedgeFundNewsCard.tsx - Enhanced with category indicators
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

        // Fetch new headlines every hour (to get top 10 from past 2 hours)
        const fetchInterval = setInterval(fetchHedgeFundNews, 60 * 60 * 1000)

        return () => clearInterval(fetchInterval)
    }, [])

    useEffect(() => {
        // Rotate headlines every 2 minutes (vs 20 min before)
        const rotateInterval = setInterval(rotateToNextHeadline, 2 * 60 * 1000)

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
        const maxCommentLength = 80
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
                    {isCommentExpanded ? 'Show less' : 'Read more'} →
                </button>
            </div>
        )
    }

    const currentNews = allNews[currentNewsIndex]

    return (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🧠</span>
                    <h3 className="text-lg font-semibold text-white">Market Intel</h3>
                </div>
                <div className="flex items-center gap-2">
                    {allNews.length > 1 && (
                        <span className="text-xs text-gray-500">
                            {currentNewsIndex + 1}/{allNews.length}
                        </span>
                    )}
                    <button
                        onClick={fetchHedgeFundNews}
                        disabled={loading}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                    >
                        {loading ? '🔄' : '↻'}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1">
                {loading ? (
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-700 rounded w-4/5 mb-2"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-4">
                        <p className="text-gray-500 mb-2">Market intel unavailable</p>
                        <p className="text-xs text-gray-600 mb-3">
                            DutchBrat is analyzing markets 🧠
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

                        {/* Rotation Info */}
                        {isClient && (
                            <div className="pt-2 border-t border-gray-700">
                                <p className="text-xs text-gray-400 text-center">
                                    Powered by DutchBrat's Market Analysis 🧠
                                    {allNews.length > 1 && lastRotated && (
                                        <span className="block mt-1">
                                            Rotates every 2 minutes •
                                            Last: {formatTimeAgo(lastRotated)}
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-500">No market intel available</p>
                        <p className="text-xs text-gray-600">Check back soon</p>
                    </div>
                )}
            </div>
        </div>
    )
}