// frontend/app/components/LatestHedgeFundTweetCard.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HedgeFundTweet {
    id: string
    text: string
    created_at: string
    public_metrics: {
        like_count: number
        retweet_count: number
        reply_count: number
    }
    url: string
    type: string
    engagement_score: number
}

interface HedgeFundTwitterData {
    user: {
        id: string
        username: string
        name: string
    }
    tweet: HedgeFundTweet
    source: string
}

export default function LatestHedgeFundTweetCard() {
    const [tweet, setTweet] = useState<HedgeFundTweet | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const fetchLatestHedgeFundTweet = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/latest-hedgefund-tweet')

            if (!response.ok) {
                throw new Error(`HedgeFund tweet fetch failed: ${response.status}`)
            }

            const data: HedgeFundTwitterData = await response.json()
            setTweet(data.tweet)
        } catch (err) {
            console.error('Error fetching latest hedge fund tweet:', err)
            setError('Failed to load latest hedge fund tweet')
        } finally {
            setLoading(false)
        }
    }

    const formatTweetDate = (dateString: string): string => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatTweetType = (type: string): string => {
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    const formatMetrics = (metrics: HedgeFundTweet['public_metrics']): string => {
        const parts: string[] = []
        if (metrics.like_count > 0) parts.push(`${metrics.like_count} likes`)
        if (metrics.retweet_count > 0) parts.push(`${metrics.retweet_count} retweets`)
        if (metrics.reply_count > 0) parts.push(`${metrics.reply_count} replies`)
        return parts.length > 0 ? parts.join(' • ') : 'No engagement yet'
    }

    useEffect(() => {
        fetchLatestHedgeFundTweet()

        // Refresh data every 10 minutes
        const interval = setInterval(fetchLatestHedgeFundTweet, 10 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900 hover:border-gray-600 transition-colors duration-200 w-full">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400 font-semibold">💼 Latest HF Commentary</p>
                {tweet && isClient && (
                    <p className="text-xs text-gray-500">
                        {formatTweetDate(tweet.created_at)}
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
                    <p className="text-gray-500 mb-2">Failed to load tweet</p>
                    <button
                        onClick={fetchLatestHedgeFundTweet}
                        className="text-sm text-blue-400 hover:underline transition-colors"
                    >
                        Try again →
                    </button>
                </div>
            ) : tweet ? (
                <div className="space-y-3">
                    <div className="text-base text-gray-900 dark:text-white leading-tight">
                        {truncateText(tweet.text, 140)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-700 text-white">
                            {formatTweetType(tweet.type)}
                        </span>
                        {tweet.engagement_score > 0 && (
                            <span className="text-xs text-gray-400">
                                Score: {tweet.engagement_score}
                            </span>
                        )}
                    </div>

                    <div className="text-xs text-gray-500">
                        {formatMetrics(tweet.public_metrics)}
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href={tweet.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-sm text-blue-400 hover:underline transition-colors"
                        >
                            💼 View on X →
                        </Link>
                        
                        <Link
                            href="https://x.com/Dutch_Brat"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-sm text-purple-400 hover:underline transition-colors"
                        >
                            Follow @Dutch_Brat →
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">No hedge fund tweets available</p>
                    <p className="text-xs text-gray-600">
                        Check back soon for market commentary 📊
                    </p>
                </div>
            )}
        </div>
    )
}