// frontend/app/components/LatestArticleCard.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Article {
    id: string
    headline: string
    summary: string
    file: string
    date: string
    link: string
    tags: string[]
    status: string
    category?: string
}

export default function LatestArticleCard() {
    const [article, setArticle] = useState<Article | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)

    // Fix hydration mismatch by ensuring client-side rendering
    useEffect(() => {
        setIsClient(true)
    }, [])

    const fetchLatestArticle = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/articles')

            if (!response.ok) {
                throw new Error(`Articles fetch failed: ${response.status}`)
            }

            const allArticles: Article[] = await response.json()
            const sorted = allArticles.sort(
                (a, b) =>
                    new Date(b.date || 0).getTime() -
                    new Date(a.date || 0).getTime()
            )
            setArticle(sorted[0] || null)
        } catch (err) {
            console.error('Error fetching latest article:', err)
            setError('Failed to load latest article')
        } finally {
            setLoading(false)
        }
    }

    const formatArticleDate = (dateString: string): string => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    useEffect(() => {
        fetchLatestArticle()

        // Refresh data every 5 minutes
        const interval = setInterval(fetchLatestArticle, 5 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900 hover:border-gray-600 transition-colors duration-200 w-full">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400 font-semibold">📰 Latest Article</p>
                {article && isClient && (
                    <p className="text-xs text-gray-500">
                        {formatArticleDate(article.date)}
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
                    <p className="text-gray-500 mb-2">Failed to load article</p>
                    <button
                        onClick={fetchLatestArticle}
                        className="text-sm text-blue-400 hover:underline transition-colors mb-2"
                    >
                        Try again →
                    </button>
                    <div>
                        <Link
                            href="/articles"
                            className="text-sm text-blue-400 hover:underline"
                        >
                            Browse all articles →
                        </Link>
                    </div>
                </div>
            ) : article ? (
                <div className="space-y-3">
                    <Link
                        href={`/articles?articleId=${article.id}`}
                        className="text-base font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:text-gray-300 transition-colors leading-tight block"
                    >
                        {truncateText(article.headline, 80)}
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {truncateText(article.summary, 120)}
                    </p>
                    <Link
                        href={`/articles?articleId=${article.id}`}
                        className="inline-block text-sm text-blue-400 hover:underline transition-colors"
                    >
                        Read full article →
                    </Link>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">No articles available</p>
                    <Link
                        href="/articles"
                        className="text-sm text-blue-400 hover:underline"
                    >
                        Browse all articles →
                    </Link>
                </div>
            )}
        </div>
    )
}