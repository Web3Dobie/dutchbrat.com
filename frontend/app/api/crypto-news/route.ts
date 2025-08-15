// frontend/app/api/crypto-news/route.ts - HTTP fetch version
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
    console.log('🔍 API route called at:', new Date().toISOString())

    try {
        console.log('📡 About to fetch from X-AI-Agent via HTTP...')
        const result = await fetchTop4HourlyHeadlines()
        console.log('📊 HTTP fetch result:', {
            success: result.success,
            dataLength: result.data.length,
            lastUpdated: result.lastUpdated
        })

        return NextResponse.json({
            success: result.success,
            data: result.data,
            lastUpdated: result.lastUpdated,
            rotationSchedule: "15min intervals"
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        })
    } catch (error) {
        console.error('❌ API route error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch crypto news'
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

async function fetchTop4HourlyHeadlines(): Promise<{ data: CryptoNewsItem[], lastUpdated: string, success: boolean }> {
    try {
        // Remove cache-busting parameter that's causing 404
        const url = `http://74.241.128.114:3001/crypto-news-data`

        console.log('🔍 Attempting HTTP fetch from:', url)

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        console.log('📡 HTTP Response status:', response.status)
        console.log('📡 HTTP Response ok:', response.ok)

        if (!response.ok) {
            console.error(`❌ HTTP error: ${response.status} ${response.statusText}`)
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('📊 Raw data received via HTTP:', JSON.stringify(data, null, 2))

        if (data.success && data.data && data.data.length > 0) {
            console.log(`✅ Loaded ${data.data.length} headlines from X-AI-Agent via HTTP`)
            console.log(`📅 Data last updated: ${data.lastUpdated}`)

            return {
                data: data.data,
                lastUpdated: data.lastUpdated,
                success: true
            }
        } else {
            console.log('⚠️ X-AI-Agent returned no headlines or empty data via HTTP')
            console.log('📊 Data structure received:', {
                success: data.success,
                dataExists: !!data.data,
                dataLength: data.data?.length,
                lastUpdated: data.lastUpdated
            })

            return {
                data: [],
                lastUpdated: data.lastUpdated || new Date().toISOString(),
                success: false
            }
        }

    } catch (error) {
        console.error('🌐 HTTP fetch from X-AI-Agent failed:', error)

        const errorDetails = {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }
        console.error('🔍 HTTP Error details:', errorDetails)

        // Return empty array instead of throwing
        return {
            data: [],
            lastUpdated: new Date().toISOString(),
            success: false
        }
    }
}