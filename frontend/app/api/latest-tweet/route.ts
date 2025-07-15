import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const BEARER = process.env.TWITTER_BEARER_TOKEN!
    if (!BEARER) throw new Error('TWITTER_BEARER_TOKEN not set')
    const USER = process.env.TWITTER_USERNAME!
    if (!USER) throw new Error('TWITTER_USERNAME not set');
    const url = `https://api.twitter.com/2/users/by/username/${USER}/tweets?max_results=1`
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${BEARER}` }
    })
    if (!resp.ok) {
      const body = await resp.text()
      console.error(`Twitter API ${resp.status}:`, body)
      throw new Error(`Twitter API error ${resp.status}`)
    }
    const data = await resp.json()
    return NextResponse.json(data.data?.[0] ?? {})
  } catch (err: any) {
    console.error('Error fetching tweet:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
