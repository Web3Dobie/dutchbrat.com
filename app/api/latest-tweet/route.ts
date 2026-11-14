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

    // Return an EMPTY tweets array, never a synthesised one.
    //
    // This previously returned a placeholder tweet ("Latest tweet from Web3
    // Dobie", id '0') stamped with `new Date()`. Because the timestamp was
    // generated per request, a hardcoded stub rendered as a real tweet posted
    // seconds ago — on every page load, indefinitely. The Web3 Dobie pipeline
    // is discontinued and hunter-agent correctly reports "No tweets found", so
    // the honest answer is that there is nothing to show.
    //
    // TweetCard already handles this: it maps an empty array to null and
    // renders the configured `fallbackMessage` ("No tweet available"), with the
    // follow link intact. No fabricated content required.
    return NextResponse.json({
      user: {
        id: 'web3_dobie',
        username: 'Web3_Dobie',
        name: 'Web3 Dobie'
      },
      tweets: [],
      source: 'unavailable'
    })
  }
}