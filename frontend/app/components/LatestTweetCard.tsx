'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Tweet {
    id: string
    text: string
    created_at: string
    public_metrics: {
        like_count: number
        retweet_count: number
        reply_count: number
    }
    url?: string
}

interface TwitterData {
    user: {
        id: string
        username: string
        name: string
    }
    tweets: Tweet[]
    source?: 'notion' | 'twitter'
    fallback?: boolean
    fallbackReason?: string
}

export default function LatestTweetCard() {
    const [tweet, setTweet] = useState<Tweet | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)
    const [dataSource, setDataSource] = useState<'notion' | 'twitter'>('notion')

    useEffect(() => {
        setIsClient(true)
    }, [])

    const fetchLatestTweet = async () => {
        try {
            setLoading(true)
            setError(null)

            // Try Notion endpoint first (our primary source now)
            console.log('🔍 Fetching latest tweet from Notion...')
            const notionResponse = await fetch('/api/latest-tweet-notion')

            if (notionResponse.ok) {
                const data: TwitterData = await notionResponse.json()
                const latestTweet = data.tweets && data.tweets.length > 0 ? data.tweets[0] : null
                
                if (latestTweet) {
                    setTweet(latestTweet)
                    setDataSource('notion')
                    console.log('✅ Successfully loaded tweet from Notion:', latestTweet.text.substring(0, 50) + '...')
                    return
                }
            } else {
                console.warn('⚠️ Notion API response not OK:', notionResponse.status, notionResponse.statusText)
            }

            // Fallback to Twitter API if Notion fails or has no data
            console.log('🔄 Notion had no data, trying Twitter API as fallback...')
            const twitterResponse = await fetch('/api/latest-tweet')

            if (twitterResponse.ok) {
                const data: TwitterData = await twitterResponse.json()
                const latestTweet = data.tweets && data.tweets.length > 0 ? data.tweets[0] : null
                
                if (latestTweet) {
                    setTweet(latestTweet)
                    setDataSource('twitter')
                    console.log('✅ Successfully loaded tweet from Twitter API')
                    return
                }
            } else {
                console.warn('⚠️ Twitter API response not OK:', twitterResponse.status, twitterResponse.statusText)
            }

            // If both fail, show error
            setError('Unable to load latest tweet from any source')

        } catch (err) {
            console.error('Error fetching latest tweet:', err)
            setError('Failed to load latest tweet')
        } finally {
            setLoading(false)
        }
    }

    const getTweetUrl = (tweet: Tweet): string => {
        // Use the stored URL if available (from Notion), otherwise construct it
        if (tweet.url) {
            return tweet.url
        }
        return `https://x.com/Web3_Dobie/status/${tweet.id}`
    }

    const formatTweetDate = (dateString: string): string => {
        try {
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
            } else if (diffDays < 7) {
                return `${diffDays}d ago`
            } else {
                return date.toLocaleDateString()
            }
        } catch (error) {
            console.warn('Error formatting date:', dateString, error)
            return 'recently'
        }
    }

    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    // Enhanced: Detect if the tweet text looks like a fallback
    const isFallbackText = (text: string): boolean => {
        return text.includes('Latest') && text.includes('from @Web3_Dobie')
    }

    const shouldShowFullText = (text: string): boolean => {
        // Show full text for real tweets, truncate only very long ones
        return !isFallbackText(text) && text.length <= 280
    }

    useEffect(() => {
        fetchLatestTweet()

        // Refresh data every 10 minutes (since we're using cached Notion data)
        const interval = setInterval(fetchLatestTweet, 10 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="p-4 border border-blue-700 rounded-xl bg-gray-900 hover:border-blue-600 transition-colors duration-200 w-full">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <p className="text-sm text-blue-400 font-semibold">🐦 Latest Tweet</p>
                    {/* Enhanced data source indicator */}
                    {!loading && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${dataSource === 'notion'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-blue-900 text-blue-300'
                            }`}>
                            {dataSource === 'notion' ? '📝' : '🐦'}
                        </span>
                    )}
                    {/* Show warning if fallback text detected */}
                    {tweet && isFallbackText(tweet.text) && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-300" title="Fallback content - original text may not be available">
                            ⚠️
                        </span>
                    )}
                </div>
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
                    <p className="text-gray-500 mb-2">{error}</p>
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
                    {/* Enhanced tweet text display */}
                    <div className="text-sm text-white leading-relaxed">
                        {shouldShowFullText(tweet.text) ? (
                            <p>{tweet.text}</p>
                        ) : (
                            <p>{truncateText(tweet.text, 200)}</p>
                        )}
                        
                        {/* Show hint for fallback content */}
                        {isFallbackText(tweet.text) && (
                            <p className="text-xs text-gray-400 mt-2 italic">
                                Content preview - click to view full tweet
                            </p>
                        )}
                    </div>

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