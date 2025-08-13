// frontend/app/components/HunterBlock.tsx - Debugging version without CryptoNewsCard
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import HunterSmiling from '../../public/images/hunter_smiling.png'
// import CryptoNewsCard from './CryptoNewsCard'  // Temporarily commented out for debugging

interface Article {
  id: string
  headline: string
  summary: string
  content?: string
  publishedAt: string
}

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

interface ArticleResponse {
  success: boolean
  article?: Article
  error?: string
}

interface TweetResponse {
  success: boolean
  data?: Tweet[]
  error?: string
}

export default function HunterBlock() {
  const [article, setArticle] = useState<Article | null>(null)
  const [tweet, setTweet] = useState<Tweet | null>(null)
  const [loading, setLoading] = useState({
    article: true,
    tweet: true
  })
  const [error, setError] = useState<string | null>(null)

  const fetchLatestArticle = async () => {
    try {
      setLoading(prev => ({ ...prev, article: true }))
      const response = await fetch('/api/articles/latest')
      const result: ArticleResponse = await response.json()

      if (result.success && result.article) {
        setArticle(result.article)
      } else {
        console.log('No latest article available')
        setArticle(null)
      }
    } catch (err) {
      console.error('Error fetching latest article:', err)
      setError('Failed to load latest article')
    } finally {
      setLoading(prev => ({ ...prev, article: false }))
    }
  }

  const fetchLatestTweet = async () => {
    try {
      setLoading(prev => ({ ...prev, tweet: true }))
      const response = await fetch('/api/twitter/latest-tweet')
      const result: TweetResponse = await response.json()

      if (result.success && result.data && result.data.length > 0) {
        setTweet(result.data[0])
      } else {
        console.log('No latest tweet available')
        setTweet(null)
      }
    } catch (err) {
      console.error('Error fetching latest tweet:', err)
      setError('Failed to load latest tweet')
    } finally {
      setLoading(prev => ({ ...prev, tweet: false }))
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
    fetchLatestTweet()

    // Refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchLatestArticle()
      fetchLatestTweet()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="mt-16 px-6">
      {/* Hero section */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start gap-8 mb-8">
        <div className="md:w-1/3 flex justify-center">
          <Image
            src={HunterSmiling}
            alt="Hunter the Web3Dobie"
            width={220}
            height={220}
            className="rounded-xl border-4 border-emerald-500 shadow-lg flex-shrink-0"
          />
        </div>
        <div className="md:w-2/3">
          <h2 className="text-3xl font-bold mb-4 text-emerald-400">
            Meet Hunter, the Alpha Dog 🐾
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
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
        <div className="text-red-500 px-4 mb-6 max-w-4xl mx-auto bg-red-900/20 border border-red-800 rounded-lg p-3">
          <span className="font-medium">⚠️ {error}</span>
        </div>
      )}

      {/* Cards section - temporarily back to 2 cards for debugging */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Latest Article Card */}
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900 hover:border-gray-600 transition-colors duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400 font-semibold">📰 Latest Article</p>
            {article && (
              <p className="text-xs text-gray-500">
                {formatArticleDate(article.publishedAt)}
              </p>
            )}
          </div>

          {loading.article ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          ) : article ? (
            <div className="space-y-3">
              <Link
                href={`/articles?articleId=${article.id}`}
                className="text-base font-semibold text-white hover:text-gray-300 transition-colors leading-tight block"
              >
                {truncateText(article.headline, 80)}
              </Link>
              <p className="text-sm text-gray-300 leading-relaxed">
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
              <p className="text-gray-500 mb-2">No articles available.</p>
              <Link
                href="/articles"
                className="text-sm text-blue-400 hover:underline"
              >
                Browse all articles →
              </Link>
            </div>
          )}
        </div>

        {/* Latest Tweet Card */}
        <div className="p-4 border border-blue-700 rounded-xl bg-gray-900 hover:border-blue-600 transition-colors duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-blue-400 font-semibold">🐦 Latest Tweet</p>
            {tweet && (
              <p className="text-xs text-gray-500">
                {formatTweetDate(tweet.created_at)}
              </p>
            )}
          </div>

          {loading.tweet ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-4/5 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
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
              <p className="text-gray-500 mb-2">No tweet available.</p>
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

        {/* Crypto News Card - Temporarily commented out for debugging */}
        {/* <CryptoNewsCard /> */}
      </div>

      {/* Additional info section */}
      <div className="max-w-4xl mx-auto mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-2">
            🤖 Hunter's AI is powered by advanced market analysis and sentiment tracking
          </p>
          <p className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()} |
            Data refreshes every 5 minutes
          </p>
        </div>
      </div>
    </section>
  )
}