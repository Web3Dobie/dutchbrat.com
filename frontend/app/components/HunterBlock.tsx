'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import HunterSmiling from '../../public/images/hunter_smiling.png'

type Article = {
  id: string;         // Add this!
  headline: string;
  summary: string;
  image: string;
  file: string;
  date: string;
}

type Tweet = {
  id: string;
  text: string;
  created_at: string;
  url: string;
}

export default function HunterBlock() {
  const [article, setArticle] = useState<Article | null>(null)
  const [tweet, setTweet] = useState<Tweet | null>(null)
  const [loading, setLoading] = useState({ article: true, tweet: true })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles')
        if (!res.ok) throw new Error(`Articles fetch failed: ${res.status}`)
        const all: Article[] = await res.json()
        const sorted = all.sort(
          (a, b) =>
            new Date(b.date || 0).getTime() -
            new Date(a.date || 0).getTime()
        )
        setArticle(sorted[0] || null)
      } catch (err: any) {
        console.error(err)
        setError('Could not load the latest article.')
      } finally {
        setLoading(l => ({ ...l, article: false }))
      }
    }

    const fetchTweet = async () => {
      try {
        const res = await fetch('/api/latest-tweet')
        if (!res.ok) throw new Error(`Tweet fetch failed: ${res.status}`)
        const data: Tweet = await res.json()
        setTweet(data)
      } catch (err: any) {
        console.error(err)
        setError('Could not load the latest tweet.')
      } finally {
        setLoading(l => ({ ...l, tweet: false }))
      }
    }

    fetchArticles()
    fetchTweet()
  }, [])

  return (
    <div className="mt-8 space-y-6">
      {/* Error */}
      {error && (
        <div className="text-red-500">
          {error}
        </div>
      )}

      {/* Latest Article Card */}
      <div className="mb-6 p-4 border border-gray-700 rounded-xl bg-gray-900">
        <p className="text-sm text-gray-400 mb-2">Latest Article</p>
        {loading.article ? (
          <p className="text-gray-500">Loading article…</p>
        ) : article ? (
          <>
            <Link
              href={`/articles?articleId=${article.id}`}
              className="text-xl font-semibold text-white hover:underline"
            >
              {article.headline}
            </Link>
            <p className="mt-1 text-gray-300">{article.summary}</p>
          </>
        ) : (
          <p className="text-gray-500">No articles available.</p>
        )}
      </div>

      {/* Latest Tweet Card */}
      <div className="p-4 border border-blue-700 rounded-xl bg-gray-900">
        <p className="text-sm text-blue-400 mb-2">Latest Tweet</p>
        {loading.tweet ? (
          <p className="text-gray-500">Loading tweet…</p>
        ) : tweet ? (
          <>
            <p className="text-base text-white mb-2">{tweet.text}</p>
            <Link
              href={tweet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              View on X (Twitter)
            </Link>
          </>
        ) : (
          <p className="text-gray-500">No tweet available.</p>
        )}
      </div>
    </div>
  )
}
