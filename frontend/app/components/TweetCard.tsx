// frontend/lib/TweetCard.tsx
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
    url: string
    type?: string
    engagement_score?: number
}

interface TwitterData {
    user: {
        id: string
        username: string
        name: string
    }
    tweets: Tweet[]
    source?: string
}

interface TweetCardConfig {
    apiEndpoint: string
    title: string
    icon: string
    borderColor: string
    titleColor: string
    linkColor: string
    fallbackMessage: string
    followLink?: string
    fallbackLink?: string
    showEngagementScore?: boolean
    showType?: boolean
    maxTextLength?: number
}

interface TweetCardProps {
    config: TweetCardConfig
}

export default function TweetCard({ config }: TweetCardProps) {
    const [tweet, setTweet] = useState<Tweet | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const fetchLatestTweet = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(config.apiEndpoint)

            if (!response.ok) {
                throw new Error(`Tweet fetch failed: ${response.status}`)
            }

            const data: TwitterData = await response.json()
            console.log('API Response:', data) // Debug log
            
            const latestTweet = data.tweets && data.tweets.length > 0 ? data.tweets[0] : null
            console.log('Latest Tweet:', latestTweet) // Debug log
            
            setTweet(latestTweet)
        } catch (err) {
            console.error(`Error fetching latest tweet from ${config.apiEndpoint}:`, err)
            setError('Failed to load latest tweet')
        } finally {
            setLoading(false)
        }
    }

    const formatText = (text: string): string => {
        if (!text) return ''
        
        // Replace \n\n with proper line breaks and clean up
        return text
            .replace(/\\n\\n/g, '\n\n')  // Handle escaped newlines
            .replace(/\n\n/g, '\n\n')    // Handle actual newlines
            .trim()
    }

    const renderFormattedText = (text: string) => {
        const formattedText = formatText(text)
        const maxLength = config.maxTextLength || 200
        const truncatedText = formattedText.length > maxLength 
            ? formattedText.substring(0, maxLength) + '...'
            : formattedText

        // Split by double newlines to create paragraphs
        const paragraphs = truncatedText.split('\n\n')
        
        return (
            <div className="text-sm text-white leading-relaxed space-y-2">
                {paragraphs.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                        {paragraph}
                    </p>
                ))}
            </div>
        )
    }

    const getTweetUrl = (tweet: Tweet): string => {
        return tweet.url || `https://x.com/Web3_Dobie/status/${tweet.id}`
    }

    const formatTweetDate = (dateString: string): string => {
        if (!dateString) return ''
        
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
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })
        }
    }

    const formatTweetType = (type: string): string => {
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatMetrics = (metrics: Tweet['public_metrics']): string => {
        const parts: string[] = []
        if (metrics.like_count > 0) parts.push(`${metrics.like_count} likes`)
        if (metrics.retweet_count > 0) parts.push(`${metrics.retweet_count} retweets`)
        if (metrics.reply_count > 0) parts.push(`${metrics.reply_count} replies`)
        return parts.length > 0 ? parts.join(' • ') : 'No engagement yet'
    }

    useEffect(() => {
        fetchLatestTweet()

        // Refresh data every 10 minutes
        const interval = setInterval(fetchLatestTweet, 10 * 60 * 1000)

        return () => clearInterval(interval)
    }, [config.apiEndpoint])

    return (
        <div className={`p-4 border ${config.borderColor} rounded-xl bg-gray-900 hover:border-opacity-80 transition-colors duration-200 w-full`}>
            <div className="flex items-center justify-between mb-3">
                <p className={`text-sm ${config.titleColor} font-semibold`}>
                    {config.icon} {config.title}
                </p>
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
                        onClick={fetchLatestTweet}
                        className={`text-sm ${config.linkColor} hover:underline transition-colors mb-2`}
                    >
                        Try again →
                    </button>
                    {config.followLink && (
                        <div>
                            <Link
                                href={config.followLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-sm ${config.linkColor} hover:underline`}
                            >
                                Follow →
                            </Link>
                        </div>
                    )}
                </div>
            ) : tweet ? (
                <div className="space-y-3">
                    {renderFormattedText(tweet.text)}
                    
                    {/* Type and engagement score row */}
                    {(config.showType || config.showEngagementScore) && (
                        <div className="flex items-center gap-2">
                            {config.showType && tweet.type && (
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-700 text-white">
                                    {formatTweetType(tweet.type)}
                                </span>
                            )}
                            {config.showEngagementScore && tweet.engagement_score !== undefined && tweet.engagement_score > 0 && (
                                <span className="text-xs text-gray-400">
                                    Score: {tweet.engagement_score}
                                </span>
                            )}
                        </div>
                    )}

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

                    <div className="flex gap-3">
                        <Link
                            href={getTweetUrl(tweet)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-block text-sm ${config.linkColor} hover:underline transition-colors`}
                        >
                            View on X →
                        </Link>
                        
                        {config.followLink && (
                            <Link
                                href={config.followLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-block text-sm ${config.linkColor} hover:underline transition-colors`}
                            >
                                Follow →
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">{config.fallbackMessage}</p>
                    {config.fallbackLink && (
                        <Link
                            href={config.fallbackLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm ${config.linkColor} hover:underline`}
                        >
                            Follow →
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}