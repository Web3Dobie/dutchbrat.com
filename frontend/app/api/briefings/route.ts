// frontend/app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

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
        })

        // Transform Notion pages to Briefing objects
        const briefings = response.results.map((page: any) => {
            const properties = page.properties;

            return {
                id: page.id,
                title: getTitle(properties.Name),
                period: getSelectValue(properties.Period),
                date: getDateValue(properties.Date),
                pdfUrl: getUrlValue(properties['PDF Link']),
                tweetUrl: getUrlValue(properties['Tweet URL'])
            };
        });

        console.log(`Returning ${briefings.length} briefings`);

        return NextResponse.json(briefings)
    } catch (err: any) {
        console.error('Error fetching briefings:', err)
        return NextResponse.json(
            { error: err.message || 'Unknown error' },
            { status: 500 }
        )
    }
}