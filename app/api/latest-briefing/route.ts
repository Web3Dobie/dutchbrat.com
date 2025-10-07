// frontend/app/api/latest-briefing/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { Pool } from 'pg'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

const pool = new Pool({
    host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || process.env.DB_NAME || 'agents_platform',
    user: process.env.POSTGRES_USER || process.env.DB_USER || 'hunter_admin',
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    ssl: false
})

// Helper function to extract title from Notion title property
function getTitle(titleProperty: any): string {
    if (!titleProperty || !titleProperty.title) return '';
    return titleProperty.title.map((item: any) => item.plain_text || '').join('');
}

// Helper function to extract select property value
function getSelectValue(selectProperty: any): string {
    if (!selectProperty || !selectProperty.select) return '';
    return selectProperty.select.name || '';
}

// Helper function to extract URL property value
function getUrlValue(urlProperty: any): string {
    if (!urlProperty || !urlProperty.url) return '';
    return urlProperty.url;
}

// Helper function to extract date property value
function getDateValue(dateProperty: any): string {
    if (!dateProperty || !dateProperty.date) return '';
    return dateProperty.date.start || '';
}

// Helper function to extract plain text from Notion rich text
function getPlainText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    return richText.map(item => item.plain_text || '').join('');
}

export async function GET(req: NextRequest) {
    try {
        const databaseId = process.env.NOTION_PDF_DATABASE_ID!

        if (!databaseId) {
            throw new Error('NOTION_PDF_DATABASE_ID environment variable not set')
        }

        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [
                {
                    property: 'Date',
                    direction: 'descending',
                },
            ],
            page_size: 1,
        })

        if (!response.results || response.results.length === 0) {
            return NextResponse.json(
                { error: 'No briefings found' },
                { status: 404 }
            )
        }

        const latestPage = response.results[0] as any
        const properties = latestPage.properties
        const notionId = latestPage.id

        // Look up database ID from PostgreSQL
        let databaseId_int = notionId; // fallback to Notion ID
        try {
            const dbResult = await pool.query(
                'SELECT id FROM hedgefund_agent.briefings WHERE notion_page_id = $1',
                [notionId]
            )
            if (dbResult.rows[0]?.id) {
                databaseId_int = dbResult.rows[0].id.toString()
            }
        } catch (dbErr) {
            console.error('Failed to lookup database ID:', dbErr)
            // Continue with Notion ID as fallback
        }

        const briefingMetadata = {
            id: databaseId_int,
            title: getTitle(properties.Name),
            period: getSelectValue(properties.Period),
            date: getDateValue(properties.Date),
            pageUrl: getUrlValue(properties['PDF Link']),
            tweetUrl: getUrlValue(properties['Tweet URL']),
            marketSentiment: getPlainText(properties['Market Sentiment']?.rich_text || [])
        }

        console.log(`Returning latest briefing: ${briefingMetadata.title} with ID: ${briefingMetadata.id}`)

        return NextResponse.json(briefingMetadata)
    } catch (err: any) {
        console.error('Error fetching latest briefing metadata:', err)
        return NextResponse.json(
            { error: err.message || 'Unknown error' },
            { status: 500 }
        )
    }
}