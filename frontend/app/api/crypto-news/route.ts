// frontend/app/api/crypto-news/route.ts - Direct file read version
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

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

interface CryptoNewsData {
    success: boolean
    data: CryptoNewsItem[]
    lastUpdated: string
    totalHeadlines?: number
    rotationSchedule?: string
    message?: string
}

export async function GET() {
    console.log('🔍 API route called at:', new Date().toISOString())

    try {
        console.log('📁 Reading crypto news file directly...')
        const result = await readCryptoNewsFile()
        console.log('📊 File read result:', {
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

async function readCryptoNewsFile(): Promise<{ data: CryptoNewsItem[], lastUpdated: string, success: boolean }> {
    try {
        // Path to the JSON file on the same VM
        const filePath = '/home/hunter/projects/X-AI-Agent/data/crypto_news_api.json'

        console.log('🔍 Attempting to read file:', filePath)

        const fileContent = await readFile(filePath, 'utf-8')
        console.log('📄 File read successfully, length:', fileContent.length)

        const data: CryptoNewsData = JSON.parse(fileContent)
        console.log('📊 Parsed data:', {
            success: data.success,
            dataLength: data.data?.length,
            lastUpdated: data.lastUpdated
        })

        if (data.success && data.data && data.data.length > 0) {
            console.log(`✅ Loaded ${data.data.length} headlines from file`)

            return {
                data: data.data,
                lastUpdated: data.lastUpdated,
                success: true
            }
        } else {
            console.log('⚠️ File contains no headlines or invalid structure')

            return {
                data: [],
                lastUpdated: data.lastUpdated || new Date().toISOString(),
                success: false
            }
        }

    } catch (error) {
        console.error('📁 File read failed:', error)

        const errorDetails = {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            code: (error as any)?.code,
            path: (error as any)?.path
        }
        console.error('🔍 Error details:', errorDetails)

        // Return empty array instead of throwing
        return {
            data: [],
            lastUpdated: new Date().toISOString(),
            success: false
        }
    }
}