// app/api/hedgefund-news/route.ts - DutchBrat Website API Route
import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

interface HedgeFundNewsItem {
    headline: string
    url: string
    score?: number
    timestamp: string
    category: string
    source: string
    dutchbratComment: string
}

interface HedgeFundNewsResponse {
    success: boolean
    data: HedgeFundNewsItem[]
    lastUpdated: string
    categories: string[]
    error?: string
}

export async function GET() {
    console.log('🧠 HedgeFund News API route called at:', new Date().toISOString())

    try {
        console.log('📡 About to fetch from HedgeFundAgent via HTTP...')
        const result = await fetchTop4HedgeFundHeadlines()
        console.log('📊 HedgeFund HTTP fetch result:', {
            success: result.success,
            dataLength: result.data.length,
            lastUpdated: result.lastUpdated
        })

        return NextResponse.json({
            success: result.success,
            data: result.data,
            lastUpdated: result.lastUpdated,
            categories: result.categories || ['macro', 'equity', 'political'],
            rotationSchedule: "20min intervals"
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        })
    } catch (error) {
        console.error('❌ HedgeFund News API route error:', error)
        const errorMessage = error instanceof Error ?
            error.message : 'Failed to fetch hedge fund news'
        return NextResponse.json(
            { success: false, error: errorMessage },
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

async function fetchTop4HedgeFundHeadlines(): Promise<{
    data: HedgeFundNewsItem[],
    lastUpdated: string,
    success: boolean,
    categories: string[]
}> {
    try {
        // Update this URL to match your HedgeFundAgent server IP/domain
        // X-AI-Agent runs on: http://74.241.128.114:3001/crypto-news-data  
        // HedgeFundAgent runs on: http://YOUR_HEDGEFUND_SERVER_IP:3002/hedgefund-news-data
        const url = `http://4.223.120.60:3002/hedgefund-news-data`

        console.log('🔍 Attempting HTTP fetch from HedgeFundAgent:', url)

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        console.log('📡 HedgeFund HTTP Response status:', response.status)
        console.log('📡 HedgeFund HTTP Response ok:', response.ok)

        if (!response.ok) {
            console.error(`❌ HedgeFund HTTP error: ${response.status} ${response.statusText}`)
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('📊 Raw hedge fund data received via HTTP:', JSON.stringify(data, null, 2))

        if (data.success && data.data && data.data.length > 0) {
            console.log(`✅ Loaded ${data.data.length} hedge fund headlines from HedgeFundAgent via HTTP`)
            console.log(`📅 Data last updated: ${data.lastUpdated}`)
            console.log(`🏷️ Categories: ${data.categories?.join(', ') || 'N/A'}`)

            return {
                data: data.data,
                lastUpdated: data.lastUpdated,
                success: true,
                categories: data.categories || ['macro', 'equity', 'political']
            }
        } else {
            console.log('⚠️ HedgeFundAgent returned no headlines or empty data via HTTP')
            console.log('📊 Data structure received:', {
                success: data.success,
                dataExists: !!data.data,
                dataLength: data.data?.length,
                lastUpdated: data.lastUpdated,
                categories: data.categories
            })

            return {
                data: [],
                lastUpdated: data.lastUpdated || new Date().toISOString(),
                success: false,
                categories: data.categories || ['macro', 'equity', 'political']
            }
        }

    } catch (error) {
        console.error('🌐 HTTP fetch from HedgeFundAgent failed:', error)

        const errorDetails = {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }

        console.error('🔍 Error details:', errorDetails)

        // Return empty data structure instead of throwing
        return {
            data: [],
            lastUpdated: new Date().toISOString(),
            success: false,
            categories: ['macro', 'equity', 'political']
        }
    }
}