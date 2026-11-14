// frontend/app/api/latest-hedgefund-tweet/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// The HedgeFund tweet log lived in HEDGEFUND_TWEET_DB_ID, a Notion database in a
// workspace we have permanently lost access to: the account's login email was
// deleted, so the sign-in verification code can no longer be received. The
// integration token still authenticates, but returns 404 object_not_found for
// this database and it can never be re-shared.
//
// This route previously called fetchLatestTweetFromNotion(), which threw on every
// request and returned HTTP 500 with err.message verbatim — publishing the Notion
// database UUID and integration name to anyone loading the homepage. It also
// carried a `fallbackText` ("Latest hedge fund commentary from HedgeFund Agent")
// that would have been presented as real tweet text.
//
// So we report the truth: there is nothing to show. TweetCard maps an empty
// `tweets` array to null and renders its configured fallbackMessage, keeping the
// follow link intact. Returning 200 (not an error status) is deliberate —
// TweetCard treats any non-OK response as a failure and shows "Failed to load
// latest tweet", which would wrongly imply a transient glitch worth retrying.
export async function GET() {
  return NextResponse.json({
    user: {
      id: 'hedgefund_agent',
      username: 'HedgeFund_Agent',
      name: 'HedgeFund Agent'
    },
    tweets: [],
    source: 'unavailable'
  })
}
