// frontend/app/api/latest-tweet/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { fetchLatestTweetFromNotion } from '../../../lib/tweetHelpers'

export async function GET(req: NextRequest) {
  const config = {
    databaseId: process.env.NOTION_TWEET_LOG_DB!,
    user: {
      id: 'web3_dobie',
      username: 'Web3_Dobie',
      name: 'Web3 Dobie'
    },
    source: 'notion',
    fallbackText: 'Latest tweet from Web3 Dobie',
    typePropertyName: 'Type'  // NEW: Main DB uses "Type"
  }

  return fetchLatestTweetFromNotion(config)
}