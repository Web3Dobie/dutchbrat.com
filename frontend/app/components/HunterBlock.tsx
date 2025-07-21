'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import HunterSmiling from '../../public/images/hunter_smiling.png'

type Article = {
  id: string
  headline: string
  summary: string
  image: string
  file: string
  date: string
}

type Tweet = {
  id: string
  text: string
  created_at: string
  public_metrics: {
    like_count: number
    retweet_count: number
    reply_count: number
  }
}

type TwitterResponse = {
  user: {
    id: string
    username: string
    name: string
  }
  tweets: Tweet[]
  fallback?: boolean
  fallbackReason?: string
}

export default function HunterBlock() {
  const [article, setArticle] = useState<Article | null>(null)
  const [tweet, setTweet] = useState<Tweet | null>(null)
  const [twitterData, setTwitterData] = useState<TwitterResponse | null>(null)
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
        console.error('Articles error:', err)
        setError('Could not load the latest article.')
      } finally {
        setLoading(l => ({ ...l, article: false }))
      }
    }

    const fetchTweet = async () => {
      try {
        const res = await fetch('/api/latest-tweet')
        if (!res.ok) throw new Error(`Tweet fetch failed: ${res.status}`)
        const data: TwitterResponse = await res.json()
        
        // Store the full response for fallback handling
        setTwitterData(data)
        
        // Get the latest tweet from the response
        const latestTweet = data.tweets && data.tweets.length > 0 ? data.tweets[0] : null
        setTweet(latestTweet)
      } catch (err: any) {
        console.error('Twitter error:', err)
        setError('Could not load the latest tweet.')
      } finally {
        setLoading(l => ({ ...l, tweet: false }))
      }
    }

    fetchArticles()
    fetchTweet()
  }, [])

  // Helper function to create Twitter URL
  const getTweetUrl = (tweet: Tweet) => {
    return `https://x.com/Web3_Dobie/status/${tweet.id}`
  }

  // Helper function to get Twitter profile URL
  const getTwitterProfileUrl = () => {
    const username = twitterData?.user?.username || 'Web3_Dobie'
    return `https://x.com/${username}`
  }

  // Check if we should show fallback
  const shouldShowFallback = () => {
    return twitterData?.fallback || (!tweet && !loading.tweet)
  }

  return (
    <section className="mt-20 border-t border-gray-800 pt-10">
      {/* Hero section - image + text side by side */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
        <Image
          src={HunterSmiling}
          alt="Hunter the Web3Dobie"
          width={220}
          height={220}
          className="rounded-xl border-4 border-emerald-500 shadow-lg flex-shrink-0"
        />
        <div className="text-lg max-w-xl">
          <p className="mb-4">
            Hunter is my trusted Web3 Doberman — part analyst, part watchdog.
            He helps sniff out alpha, barks at scams, and keeps this site running
            with daily insights on X, commentary, and briefings. Follow his
            instincts. They're usually right.
          </p>
          <a
            href="https://x.com/@Web3_Dobie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-emerald-400 font-semibold hover:underline"
          >
            → Follow @Web3_Dobie on X 🐾
          </a>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-red-500 px-4 mb-6 max-w-4xl mx-auto">{error}</div>
      )}

      {/* Cards section - underneath hero, aligned with text width */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Latest Article Card */}
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900">
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
          ) : shouldShowFallback() ? (
            /* Fallback: Show Twitter account link instead of error message */
            <div className="text-center py-4">
              <div className="mb-3">
                <svg 
                  className="w-12 h-12 mx-auto text-blue-400 mb-2" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <p className="text-gray-300 mb-3">
                Latest tweets temporarily unavailable
              </p>
              <Link
                href={getTwitterProfileUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg 
                  className="w-4 h-4" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Visit @{twitterData?.user?.username || 'Web3_Dobie'} on X
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                {twitterData?.fallbackReason === 'rate_limit' 
                  ? 'Rate limit reached - check back soon!' 
                  : 'Service temporarily unavailable'}
              </p>
            </div>
          ) : tweet ? (
            <>
              <p className="text-base text-white mb-2">{tweet.text}</p>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                <span>❤️ {tweet.public_metrics.like_count}</span>
                <span>🔄 {tweet.public_metrics.retweet_count}</span>
                <span>💬 {tweet.public_metrics.reply_count}</span>
              </div>
              <Link
                href={getTweetUrl(tweet)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View on X (Twitter)
              </Link>
            </>
          ) : (
            /* Final fallback if no tweet and no fallback data */
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">No tweet available</p>
              <Link
                href={getTwitterProfileUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Visit @Web3_Dobie on X
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}