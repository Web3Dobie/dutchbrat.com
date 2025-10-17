// components/LatestHTDArticleCard.tsx
'use client'
import { useEffect, useState } from 'react'
import { HTDArticleCard } from './HTDArticleCard'

interface HTDArticle {
    id: string
    title: string
    summary: string
    publishedDate: string
    category: string
    size: number
}

export default function LatestHTDArticleCard() {
    const [latestArticle, setLatestArticle] = useState<HTDArticle | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/htd-articles?limit=1')
            .then(res => res.json())
            .then(data => {
                if (data.articles && data.articles.length > 0) {
                    setLatestArticle(data.articles[0])
                }
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to load latest HTD article:', err)
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-4 w-24"></div>
                <div className="h-6 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded mb-4"></div>
            </div>
        )
    }

    if (!latestArticle) {
        return (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <div className="text-center text-gray-400">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium mb-3 inline-block">
                        HTD Research
                    </span>
                    <h3 className="text-lg font-semibold mb-2">Latest Analysis</h3>
                    <p className="text-sm">No articles available yet</p>
                </div>
            </div>
        )
    }

    // Use your existing HTDArticleCard with the fetched data
    return (
        <HTDArticleCard
            id={latestArticle.id}
            title={latestArticle.title}
            summary={latestArticle.summary}
            publishedDate={latestArticle.publishedDate}
            category={latestArticle.category}
            size={latestArticle.size}
        />
    )
}