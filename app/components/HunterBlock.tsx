// frontend/app/components/HunterBlock.tsx - Refactored with separate card components
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import HunterSmiling from '../../public/images/hunter_smiling.png'
import LatestArticleCard from './LatestArticleCard'
import LatestTweetCard from './LatestTweetCard'
import CryptoNewsCard from './CryptoNewsCard'

export default function HunterBlock() {
  const [isClient, setIsClient] = useState(false)

  // Fix hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <section className="mt-16 px-6">
      {/* Hero section */}
      <div className="max-w-4xl flex flex-col md:flex-row items-start gap-8 mb-8">
        <div className="flex justify-start">
          <Image
            src={HunterSmiling}
            alt="Hunter the Web3Dobie"
            width={220}
            height={220}
            className="rounded-xl border-4 border-emerald-500 shadow-lg flex-shrink-0"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-4 text-emerald-400">
            Meet Hunter, the Alpha Dog 🐾
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            Hunter is my trusted Web3 Dobermann — part analyst, part watchdog.
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

      {/* Cards section - clean 3-card layout */}
      <div className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Latest Article Card */}
          <LatestArticleCard />

          {/* Latest Tweet Card */}
          <LatestTweetCard />

          {/* Crypto News Card */}
          <div className="lg:col-span-2 xl:col-span-1">
            <CryptoNewsCard />
          </div>
        </div>
      </div>

      {/* Additional info section */}
      <div className="max-w-4xl mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-2">
            🤖 Hunter's AI is powered by advanced market analysis and sentiment tracking
          </p>
          {isClient && (
            <p className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()} |
              Data refreshes every 5 minutes
            </p>
          )}
        </div>
      </div>
    </section>
  )
}