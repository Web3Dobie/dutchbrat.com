import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const BEARER = process.env.TWITTER_BEARER_TOKEN!
    // replace `your_handle` with your actual username or pull from env
    const resp = await fetch(
      'https://api.twitter.com/2/users/by/username/your_handle/tweets?max_results=1',
      { headers: { Authorization: `Bearer ${BEARER}` } }
    )
    if (!resp.ok) {
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
