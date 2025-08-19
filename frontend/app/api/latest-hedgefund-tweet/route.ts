// frontend/app/api/latest-hedgefund-tweet/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { fetchLatestTweetFromNotion } from '../../../lib/tweetHelpers'

export async function GET(req: NextRequest) {
  const config = {
    databaseId: process.env.HEDGEFUND_TWEET_DB_ID!,
    user: {
      id: 'hedgefund_agent',
      username: 'HedgeFund_Agent',
      name: 'HedgeFund Agent'
    },
    source: 'hedgefund_notion',
    fallbackText: 'Latest hedge fund commentary from HedgeFund Agent'
  }

  return fetchLatestTweetFromNotion(config)
}