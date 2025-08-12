// app/api/mexc/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const symbol = searchParams.get('symbol')
        const endpoint = searchParams.get('endpoint') || 'ticker/24hr'
        const interval = searchParams.get('interval')
        const limit = searchParams.get('limit')

        if (!symbol) {
            return NextResponse.json(
                { error: 'Symbol parameter is required' },
                { status: 400 }
            )
        }

        // Build MEXC API URL
        let mexcUrl = `https://api.mexc.com/api/v3/${endpoint}?symbol=${symbol}`

        // Add optional parameters
        if (interval) mexcUrl += `&interval=${interval}`
        if (limit) mexcUrl += `&limit=${limit}`

        console.log('Fetching from MEXC:', mexcUrl)

        const response = await fetch(mexcUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DutchBrat/1.0)',
            },
        })

        if (!response.ok) {
            throw new Error(`MEXC API error: ${response.status}`)
        }

        const data = await response.json()

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        })
    } catch (error: any) {
        console.error('MEXC API proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch from MEXC' },
            { status: 500 }
        )
    }
}