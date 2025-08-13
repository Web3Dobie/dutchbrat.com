// frontend/app/api/crypto-news/route.ts
import { NextResponse } from 'next/server'

interface CryptoNewsItem {
    headline: string
    url: string
    score?: number
    timestamp: string
    source: string
    hunterComment: string
}

export async function GET() {
    try {
        const cryptoNews = await fetchTop4HourlyHeadlines()

        return NextResponse.json({
            success: true,
            data: cryptoNews,
            lastUpdated: new Date().toISOString(),
            rotationSchedule: "15min intervals"
        })
    } catch (error) {
        console.error('Error fetching crypto news:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch crypto news' },
            { status: 500 }
        )
    }
}

async function fetchTop4HourlyHeadlines(): Promise<CryptoNewsItem[]> {
    try {
        // Fetch from X-AI-Agent HTTP server
        // Replace 'YOUR_VM_IP' with your actual VM IP address
        const response = await fetch('http://74.241.128.114:3001/crypto-news-data', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.success && data.data && data.data.length > 0) {
            console.log(`✅ Loaded ${data.data.length} headlines from X-AI-Agent via HTTP`)
            return data.data
        } else {
            console.log('⚠️ X-AI-Agent returned no headlines')
            return []
        }

    } catch (error) {
        console.error('🌐 HTTP fetch from X-AI-Agent failed:', error)

        // Return empty array instead of mock data
        // The component will show "News fetch unavailable"
        return []
    }
}