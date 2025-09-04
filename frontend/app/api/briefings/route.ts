// frontend/app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { Pool } from 'pg';

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
    timeoutMs: 10000  // Shorter timeout for testing
});

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// Simple helper functions
function getPlainText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    return richText.map(item => item.plain_text || '').join('');
}
function getTitle(titleProperty: any): string {
    if (!titleProperty?.title) return '';
    return titleProperty.title.map((item: any) => item.plain_text || '').join('');
}
function getSelectValue(selectProperty: any): string {
    return selectProperty?.select?.name || '';
}
function getUrlValue(urlProperty: any): string {
    return urlProperty?.url || '';
}
function getDateValue(dateProperty: any): string {
    return dateProperty?.date?.start || '';
}

export async function GET(req: NextRequest) {
    console.log("=== DEBUG ROUTE v1.0 - MINIMAL TEST ===");

    const { searchParams } = new URL(req.url);
    const briefingIdParam = searchParams.get('briefingId');

    if (briefingIdParam) {
        console.log(`🔍 Testing individual briefing: ${briefingIdParam}`);

        let notionId: string | null = null;
        let briefingRecord: any = null;

        // Step 1: Resolve Notion ID
        try {
            console.log(`🔍 Starting database lookup for: ${briefingIdParam}`);

            if (!isNaN(parseInt(briefingIdParam))) {
                const dbId = parseInt(briefingIdParam);
                console.log(`📊 Querying by DB ID: ${dbId}`);
                const res = await pool.query('SELECT * FROM hedgefund_agent.briefings WHERE id = $1', [dbId]);
                console.log(`✅ DB ID query completed, rows: ${res.rows.length}`);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    notionId = briefingRecord.notion_page_id;
                    console.log(`✅ Found Notion ID: ${notionId}`);
                } else {
                    console.log(`❌ No record found for DB ID: ${dbId}`);
                }
            } else {
                console.log(`🔗 Querying by Notion ID: ${briefingIdParam}`);
                const res = await pool.query('SELECT * FROM hedgefund_agent.briefings WHERE notion_page_id = $1', [briefingIdParam]);
                console.log(`✅ Notion ID query completed, rows: ${res.rows.length}`);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    notionId = briefingIdParam;
                    console.log(`✅ Found database record for Notion ID`);
                } else {
                    console.log(`⚠️ No database record found for Notion ID: ${briefingIdParam}`);
                }
            }
        } catch (e: any) {
            console.error(`❌ Database lookup error for ${briefingIdParam}:`);
            console.error(`❌ Error name: ${e?.constructor?.name || 'Unknown'}`);
            console.error(`❌ Error message: ${e?.message || 'No message'}`);
            console.error(`❌ Error code: ${e?.code || 'No code'}`);
            console.error(`❌ Full error:`, e);
            return NextResponse.json({
                error: 'Database error',
                details: e?.message || 'Unknown error',
                errorType: e?.constructor?.name || 'Unknown'
            }, { status: 500 });
        }

        if (!notionId) {
            // If not found in database, try using the original ID as Notion ID directly
            notionId = briefingIdParam;
            console.log(`⚠️ Not found in database, trying direct Notion fetch: ${notionId}`);
        }

        // Step 2: Check cache
        if (briefingRecord?.json_content) {
            console.log(`⚡ CACHE HIT - returning cached content`);
            return NextResponse.json({ data: [briefingRecord.json_content] });
        }

        console.log(`🔄 CACHE MISS - fetching from Notion (PROPERTIES ONLY)`);

        // Step 3: Fetch ONLY page properties (no blocks)
        try {
            console.log(`📄 Fetching page properties from Notion...`);
            const pageResponse = await notion.pages.retrieve({ page_id: notionId });
            const page = pageResponse as any;

            console.log(`✅ Got page response`);
            console.log(`📋 Available properties:`, Object.keys(page.properties || {}));

            if (!page.properties) {
                throw new Error(`No properties found for page ${notionId}`);
            }

            // Build response with EMPTY content for now
            const briefing = {
                id: briefingRecord?.id || page.id,
                title: getTitle(page.properties.Name),
                period: getSelectValue(page.properties.Period),
                date: getDateValue(page.properties.Date),
                pageUrl: getUrlValue(page.properties['PDF Link']),
                tweetUrl: getUrlValue(page.properties['Tweet URL']),
                marketSentiment: getPlainText(page.properties['Market Sentiment']?.rich_text || []),
                content: [
                    {
                        id: 'test',
                        type: 'paragraph',
                        content: {
                            richText: [{
                                type: 'text',
                                text: 'DEBUG: Properties loaded successfully, block parsing disabled for testing',
                                annotations: {}
                            }]
                        },
                        children: []
                    }
                ]
            };

            console.log(`📤 Returning briefing:`, {
                title: briefing.title,
                period: briefing.period,
                hasContent: briefing.content.length > 0
            });

            return NextResponse.json({ data: [briefing] });

        } catch (err: any) {
            console.error(`❌ Notion fetch error:`, err);
            console.error(`❌ Error type:`, err.constructor.name);
            console.error(`❌ Error message:`, err.message);

            return NextResponse.json({
                error: `Notion fetch failed: ${err.message}`,
                details: err.toString()
            }, { status: 500 });
        }
    }

    // List view (unchanged)
    console.log('📋 List view request');
    try {
        const databaseId = process.env.NOTION_PDF_DATABASE_ID!;
        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const startCursor = searchParams.get('cursor') || undefined;

        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [{ property: 'Date', direction: 'descending' }],
            page_size: pageSize,
            start_cursor: startCursor
        });

        const briefings = response.results.map((result) => {
            const page = result as any;
            if (!page.properties) return null;

            return {
                id: page.id,
                title: getTitle(page.properties.Name),
                period: getSelectValue(page.properties.Period),
                date: getDateValue(page.properties.Date),
                pageUrl: getUrlValue(page.properties['PDF Link']),
                tweetUrl: getUrlValue(page.properties['Tweet URL']),
                marketSentiment: getPlainText(page.properties['Market Sentiment']?.rich_text || []),
                content: []
            };
        }).filter(Boolean);

        return NextResponse.json({
            data: briefings,
            pagination: {
                hasMore: response.has_more,
                nextCursor: response.next_cursor
            }
        });

    } catch (err: any) {
        console.error('❌ List view error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}