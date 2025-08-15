// frontend/app/api/crypto-news/route.ts - Fixed version
import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

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
        const result = await fetchTop4HourlyHeadlines()

        return NextResponse.json({
            success: true,
            data: result.data,
            lastUpdated: result.lastUpdated, // Use the actual lastUpdated from your server
            rotationSchedule: "15min intervals"
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        })
    } catch (error) {
        console.error('Error fetching crypto news:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch crypto news' },
            {
                status: 500,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            }
        )
    }
}

async function fetchTop4HourlyHeadlines(): Promise<{ data: CryptoNewsItem[], lastUpdated: string }> {
    try {
        // Add cache-busting parameter
        const timestamp = Date.now()
        const response = await fetch(`http://74.241.128.114:3001/crypto-news-data?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
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
            console.log(`📅 Data last updated: ${data.lastUpdated}`)

            return {
                data: data.data,
                lastUpdated: data.lastUpdated // Preserve the original timestamp
            }
        } else {
            console.log('⚠️ X-AI-Agent returned no headlines')
            return {
                data: [],
                lastUpdated: new Date().toISOString()
            }
        }

    } catch (error) {
        console.error('🌐 HTTP fetch from X-AI-Agent failed:', error)

        // Return empty array instead of mock data
        return {
            data: [],
            lastUpdated: new Date().toISOString()
        }
    }
}