// frontend/app/components/LatestTweetCard.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Tweet {
    id: string
    text: string
    created_at: string
    public_metrics: {
        retweet_count: number
        like_count: number
        reply_count: number
        quote_count: number
    }
    author_id: string
}

export default function LatestTweetCard() {
    const [tweet, setTweet] = useState<Tweet | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)

    // Fix hydration mismatch by ensuring client-side rendering
    useEffect(() => {
        setIsClient(true)
    }, [])

    const fetchLatestTweet = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/latest-tweet')

            if (!response.ok) {
                throw new Error(`Tweet fetch failed: ${response.status}`)
            }

            const data: any = await response.json()

            // Handle the response structure from your original API
            const latestTweet = data.tweets && data.tweets.length > 0 ? data.tweets[0] : null
            setTweet(latestTweet)
        } catch (err) {
            console.error('Error fetching latest tweet:', err)
            setError('Failed to load latest tweet')
        } finally {
            setLoading(false)
        }
    }

    const getTweetUrl = (tweet: Tweet): string => {
        // Assuming the author_id corresponds to Web3_Dobie account
        return `https://x.com/Web3_Dobie/status/${tweet.id}`
    }

    const formatTweetDate = (dateString: string): string => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        if (diffHours < 1) {
            const diffMins = Math.floor(diffMs / (1000 * 60))
            return `${diffMins}m ago`
        } else if (diffHours < 24) {
            return `${diffHours}h ago`
        } else {
            return `${diffDays}d ago`
        }
    }

    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    useEffect(() => {
        fetchLatestTweet()

        // Refresh data every 5 minutes
        const interval = setInterval(fetchLatestTweet, 5 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="p-4 border border-blue-700 rounded-xl bg-gray-900 hover:border-blue-600 transition-colors duration-200 w-full">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-blue-400 font-semibold">🐦 Latest Tweet</p>
                {tweet && isClient && (
                    <p className="text-xs text-gray-500">
                        {formatTweetDate(tweet.created_at)}
                    </p>
                )}
            </div>

            {loading ? (
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-4/5 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">Failed to load tweet</p>
                    <button
                        onClick={fetchLatestTweet}
                        className="text-sm text-blue-400 hover:underline transition-colors mb-2"
                    >
                        Try again →
                    </button>
                    <div>
                        <a
                            href="https://x.com/@Web3_Dobie"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:underline"
                        >
                            Follow @Web3_Dobie →
                        </a>
                    </div>
                </div>
            ) : tweet ? (
                <div className="space-y-3">
                    <p className="text-sm text-white leading-relaxed">
                        {truncateText(tweet.text, 160)}
                    </p>

                    {/* Engagement metrics */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                            <span>❤️</span>
                            <span>{tweet.public_metrics.like_count.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span>🔄</span>
                            <span>{tweet.public_metrics.retweet_count.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span>💬</span>
                            <span>{tweet.public_metrics.reply_count.toLocaleString()}</span>
                        </span>
                    </div>

                    <Link
                        href={getTweetUrl(tweet)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-blue-400 hover:underline transition-colors"
                    >
                        View on X (Twitter) →
                    </Link>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">No tweet available</p>
                    <a
                        href="https://x.com/@Web3_Dobie"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline"
                    >
                        Follow @Web3_Dobie →
                    </a>
                </div>
            )}
        </div>
    )
}