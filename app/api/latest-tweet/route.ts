// frontend/app/api/latest-tweet/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Call Hunter Agent's API
    const hunterAgentUrl = 'http://hunter-agent:3001'
    const response = await fetch(`${hunterAgentUrl}/api/latest-tweet`, {
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      throw new Error(`Hunter Agent returned ${response.status}`)
    }

    const data = await response.json()

    if (!data.success || !data.data) {
      throw new Error('Failed to fetch latest tweet')
    }

    const tweetData = data.data

    // Format to match what TweetCard expects (same as hedgefund response)
    return NextResponse.json({
      user: tweetData.user,
      tweets: [{
        id: tweetData.id,
        text: tweetData.text,
        created_at: tweetData.createdAt,
        url: tweetData.url,
        type: tweetData.type,
        // No public_metrics since we don't fetch from X
        public_metrics: {
          like_count: 0,
          retweet_count: 0,
          reply_count: 0
        }
      }],
      source: 'hunter_postgres'
    })

  } catch (error) {
    console.error('Error fetching latest tweet:', error)
    
    // Return fallback in the same format
    return NextResponse.json({
      user: {
        id: 'web3_dobie',
        username: 'Web3_Dobie',
        name: 'Web3 Dobie'
      },
      tweets: [{
        id: '0',
        text: 'Latest tweet from Web3 Dobie',
        created_at: new Date().toISOString(),
        url: 'https://x.com/Web3_Dobie',
        public_metrics: { like_count: 0, retweet_count: 0, reply_count: 0 }
      }],
      source: 'fallback'
    })
  }
}