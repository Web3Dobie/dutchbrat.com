// app/api/latest-tweet/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const BEARER = process.env.TWITTER_BEARER_TOKEN;
    if (!BEARER) throw new Error('TWITTER_BEARER_TOKEN not set');

    const USER = process.env.TWITTER_USERNAME;
    if (!USER) throw new Error('TWITTER_USERNAME not set');

    // 1) Lookup user ID
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${USER}`,
      { headers: { Authorization: `Bearer ${BEARER}` } }
    );
    if (!userRes.ok) {
      const body = await userRes.text();
      console.error(`Twitter user API ${userRes.status}:`, body);
      return NextResponse.json(
        { error: `User lookup failed (${userRes.status})` },
        { status: 502 }
      );
    }
    const userData = await userRes.json();
    const id = userData.data?.id;
    if (!id) {
      console.error('Twitter response missing data.id:', userData);
      return NextResponse.json(
        { error: 'Unable to extract user ID from Twitter' },
        { status: 502 }
      );
    }

    // 2) Fetch latest tweet
    const tweetRes = await fetch(
      `https://api.twitter.com/2/users/${id}/tweets?max_results=5`,
      { headers: { Authorization: `Bearer ${BEARER}` } }
    );
    if (!tweetRes.ok) {
      const body = await tweetRes.text();
      console.error(`Twitter tweets API ${tweetRes.status}:`, body);
      return NextResponse.json(
        { error: `Tweet fetch failed (${tweetRes.status})` },
        { status: 502 }
      );
    }
    const tweetData = await tweetRes.json();
    const tweet = tweetData.data?.[0];
    if (!tweet) {
      return NextResponse.json(
        { error: 'No tweets returned by Twitter' },
        { status: 204 }
      );
    }

    // 3) Success
    return NextResponse.json(tweet);
  } catch (err: any) {
    console.error('Unhandled error in /api/latest-tweet:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown server error' },
      { status: 500 }
    );
  }
}
