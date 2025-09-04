// frontend/app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { Pool } from 'pg';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// Simple helper functions for property extraction
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

// Simplified block parsing - get it working first, optimize later
async function parseSimpleNotionBlocks(pageId: string): Promise<any[]> {
    try {
        console.log(`🔍 Fetching blocks for page: ${pageId}`);

        // Get the first level of blocks
        const response = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100
        });

        console.log(`📄 Found ${response.results.length} top-level blocks`);

        const blocks = await Promise.all(response.results.map(async (block: any) => {
            const blockType = block.type;
            let content: any = {};

            // Handle different block types simply
            switch (blockType) {
                case 'heading_1':
                case 'heading_2':
                case 'heading_3':
                    content = {
                        text: getPlainText(block[blockType]?.rich_text || []),
                        level: blockType.split('_')[1]
                    };
                    break;

                case 'paragraph':
                    content = {
                        text: getPlainText(block.paragraph?.rich_text || [])
                    };
                    break;

                case 'quote':
                    content = {
                        text: getPlainText(block.quote?.rich_text || [])
                    };
                    break;

                case 'bulleted_list_item':
                case 'numbered_list_item':
                    content = {
                        text: getPlainText(block[blockType]?.rich_text || [])
                    };
                    break;

                case 'table':
                    // Simplified table handling - get children
                    try {
                        const tableResponse = await notion.blocks.children.list({
                            block_id: block.id,
                            page_size: 100
                        });

                        content = {
                            rows: tableResponse.results.map((row: any) => {
                                if (row.type === 'table_row') {
                                    return {
                                        cells: row.table_row?.cells?.map((cell: any[]) =>
                                            getPlainText(cell)
                                        ) || []
                                    };
                                }
                                return null;
                            }).filter(Boolean)
                        };
                    } catch (tableError) {
                        console.error(`❌ Failed to fetch table rows for ${block.id}:`, tableError);
                        content = { error: 'Failed to load table data' };
                    }
                    break;

                case 'column_list':
                    // Handle columns - get children
                    try {
                        const columnsResponse = await notion.blocks.children.list({
                            block_id: block.id
                        });

                        content = {
                            columns: await Promise.all(columnsResponse.results.map(async (column: any) => {
                                if (column.type === 'column') {
                                    const columnBlocks = await notion.blocks.children.list({
                                        block_id: column.id
                                    });
                                    return {
                                        blocks: columnBlocks.results.map((columnBlock: any) => ({
                                            type: columnBlock.type,
                                            text: getPlainText(columnBlock[columnBlock.type]?.rich_text || [])
                                        }))
                                    };
                                }
                                return null;
                            }))
                        };
                    } catch (columnError) {
                        console.error(`❌ Failed to fetch columns for ${block.id}:`, columnError);
                        content = { error: 'Failed to load column data' };
                    }
                    break;

                case 'toggle':
                    content = {
                        text: getPlainText(block.toggle?.rich_text || []),
                        hasChildren: block.has_children
                    };
                    break;

                case 'divider':
                    content = { type: 'divider' };
                    break;

                default:
                    console.log(`⚠️ Unhandled block type: ${blockType}`);
                    content = {
                        unsupported: true,
                        originalType: blockType,
                        text: `[${blockType.toUpperCase()} BLOCK]`
                    };
            }

            return {
                id: block.id,
                type: blockType,
                content: content,
                hasChildren: block.has_children
            };
        }));

        console.log(`✅ Successfully parsed ${blocks.length} blocks`);
        return blocks;

    } catch (error) {
        console.error(`❌ Failed to parse blocks for page ${pageId}:`, error);
        return [];
    }
}

// UNIFIED GET METHOD
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const briefingIdParam = searchParams.get('briefingId');
    let client;

    // Handle specific briefing request
    if (briefingIdParam) {
        try {
            client = await pool.connect();
            console.log(`🚀 API called for specific briefingId: ${briefingIdParam}`);

            let notionId: string | null = null;
            let briefingRecord: any = null;

            // Handle both database ID and Notion ID
            if (!isNaN(parseInt(briefingIdParam))) {
                const dbId = parseInt(briefingIdParam);
                const res = await client.query(
                    'SELECT * FROM hedgefund_agent.briefings WHERE id = $1',
                    [dbId]
                );
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    notionId = briefingRecord.notion_page_id;
                    console.log(`📊 Found briefing in database: ${dbId} -> ${notionId}`);
                }
            } else {
                notionId = briefingIdParam;
                const res = await client.query(
                    'SELECT * FROM hedgefund_agent.briefings WHERE notion_page_id = $1',
                    [notionId]
                );
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    console.log(`📊 Found briefing record for Notion ID: ${notionId}`);
                }
            }

            if (!notionId) {
                console.log(`❌ Briefing not found for ID: ${briefingIdParam}`);
                return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
            }

            // Skip cache for now - focus on getting Notion content working
            console.log(`📝 Fetching fresh content from Notion for: ${notionId}`);

            // Fetch page properties
            const pageResponse = await notion.pages.retrieve({ page_id: notionId });
            const page = pageResponse as any;

            if (!page.properties) {
                throw new Error(`Could not retrieve properties for Notion page ${notionId}`);
            }

            console.log(`📄 Page properties retrieved successfully`);
            console.log(`📋 Available properties: ${Object.keys(page.properties).join(', ')}`);

            // Parse the content blocks
            const content = await parseSimpleNotionBlocks(notionId);

            // Build response object
            const singleBriefing = {
                id: briefingRecord?.id || page.id,
                title: getTitle(page.properties.Name),
                period: getSelectValue(page.properties.Period),
                date: getDateValue(page.properties.Date),
                pageUrl: getUrlValue(page.properties['PDF Link']),
                tweetUrl: getUrlValue(page.properties['Tweet URL']),
                marketSentiment: getSelectValue(page.properties.Sentiment), // Fixed: use Sentiment property
                content: content
            };

            console.log(`✅ Successfully built briefing response with ${content.length} blocks`);
            console.log(`📝 Title: ${singleBriefing.title}`);
            console.log(`📅 Date: ${singleBriefing.date}`);
            console.log(`😊 Sentiment: ${singleBriefing.marketSentiment}`);

            return NextResponse.json({ data: [singleBriefing] });

        } catch (err: any) {
            console.error(`❌ Error processing specific briefing (${briefingIdParam}):`, err);
            console.error(`❌ Error stack:`, err.stack);

            if (err.code === 'object_not_found') {
                return NextResponse.json({ error: 'Not Found in Notion' }, { status: 404 });
            }
            return NextResponse.json({
                error: 'Internal Server Error',
                details: err.message
            }, { status: 500 });
        } finally {
            client?.release();
        }
    }

    // Handle list view (simplified for now)
    try {
        console.log('📋 API called for list of briefings');
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
                marketSentiment: getSelectValue(page.properties.Sentiment), // Fixed: use Sentiment property
                content: [] // Empty for list view
            };
        }).filter(Boolean);

        console.log(`✅ Retrieved ${briefings.length} briefings for list view`);

        return NextResponse.json({
            data: briefings,
            pagination: {
                hasMore: response.has_more,
                nextCursor: response.next_cursor
            }
        });

    } catch (err: any) {
        console.error('❌ Error fetching briefings list:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}