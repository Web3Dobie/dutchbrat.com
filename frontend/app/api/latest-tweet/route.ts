import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const BEARER = process.env.TWITTER_BEARER_TOKEN!
    if (!BEARER) throw new Error('TWITTER_BEARER_TOKEN not set')
    const USER = process.env.TWITTER_USERNAME!
    if (!USER) throw new Error('TWITTER_USERNAME not set');

    // Fetch user info to obtain the id
    const userResp = await fetch(
      `https://api.twitter.com/2/users/by/username/${USER}`,
      { headers: { Authorization: `Bearer ${BEARER}` } }
    )
    if (!userResp.ok) {
      const body = await userResp.text()
      console.error(`Twitter user API ${userResp.status}:`, body)
      throw new Error(`Twitter API error ${userResp.status}`)
    }
    const userData = await userResp.json()
    const id = userData.data?.id
    if (!id) throw new Error('User ID not found')

    // Fetch the latest tweet using the obtained id
    const tweetResp = await fetch(
      `https://api.twitter.com/2/users/${id}/tweets?max_results=1`,
      { headers: { Authorization: `Bearer ${BEARER}` } }
    )
    if (!tweetResp.ok) {
      const body = await tweetResp.text()
      console.error(`Twitter tweets API ${tweetResp.status}:`, body)
      throw new Error(`Twitter API error ${tweetResp.status}`)
    }
    const tweetData = await tweetResp.json()
    return NextResponse.json(tweetData.data?.[0] ?? {})
  } catch (err: any) {
    console.error('Error fetching tweet:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
