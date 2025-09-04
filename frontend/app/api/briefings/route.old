// frontend/app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { Pool } from 'pg';

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// --- HELPER FUNCTIONS (UNCHANGED FROM WORKING VERSION) ---
function getPlainText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    return richText.map(item => item.plain_text || '').join('');
}
function getTitle(titleProperty: any): string {
    if (!titleProperty || !titleProperty.title) return '';
    return titleProperty.title.map((item: any) => item.plain_text || '').join('');
}
function getSelectValue(selectProperty: any): string {
    if (!selectProperty || !selectProperty.select) return '';
    return selectProperty.select.name || '';
}
function getUrlValue(urlProperty: any): string {
    if (!urlProperty || !urlProperty.url) return '';
    return urlProperty.url;
}
function getDateValue(dateProperty: any): string {
    if (!dateProperty || !dateProperty.date) return '';
    return dateProperty.date.start || '';
}
function parseRichText(richText: any[]): any[] {
    if (!richText || !Array.isArray(richText)) return [];
    return richText.map(item => ({
        type: 'text',
        text: item.plain_text || item.text?.content || '',
        annotations: item.annotations || {},
        href: item.href || item.text?.link?.url || null
    }));
}
function sortTableByPerformance(tableBlock: any): any {
    if (tableBlock.type !== 'table' || !tableBlock.children || tableBlock.children.length < 2) {
        return tableBlock;
    }
    // Check for header row by looking at its content, not just the Notion property
    const potentialHeaderRow = tableBlock.children[0];
    let hasHeader = !getPlainText(potentialHeaderRow.content.cells).match(/(\d+%|\d+bps)/);

    const dataRows = hasHeader ? tableBlock.children.slice(1) : tableBlock.children;
    const referenceRow = hasHeader ? potentialHeaderRow : dataRows[0];

    let changeColumnIndex = -1;
    for (let i = 0; i < referenceRow.content.cells.length; i++) {
        const cellText = getPlainText(referenceRow.content.cells[i]);
        if (cellText.includes('%') || cellText.toLowerCase().includes('bps')) {
            changeColumnIndex = i;
            break;
        }
    }

    if (changeColumnIndex === -1) {
        return tableBlock;
    }

    dataRows.sort((rowA: any, rowB: any) => {
        const valueA = parseFloat(getPlainText(rowA.content.cells[changeColumnIndex]).replace(/%|bps/g, '').trim());
        const valueB = parseFloat(getPlainText(rowB.content.cells[changeColumnIndex]).replace(/%|bps/g, '').trim());
        if (isNaN(valueA) || isNaN(valueB)) return 0;
        return valueB - valueA;
    });

    tableBlock.children = hasHeader ? [potentialHeaderRow, ...dataRows] : dataRows;
    return tableBlock;
}

// --- OPTIMIZED PARSING LOGIC (UNCHANGED FROM WORKING VERSION) ---
async function fetchBlockChildren(blockId: string): Promise<any[]> {
    try {
        console.log(`🔍 Fetching children for block: ${blockId}`);
        const response = await notion.blocks.children.list({ block_id: blockId, page_size: 100 });
        console.log(`📄 Found ${response.results.length} children for block ${blockId}`);
        return response.results;
    } catch (error) {
        console.error(`❌ Failed to fetch children for block ${blockId}:`, error);
        return [];
    }
}

function parseBlockContent(block: any): any {
    const type = block.type;
    console.log(`🔧 Parsing block type: ${type}`);

    if (block[type]) {
        const content = { ...block[type] };
        if (content.rich_text) {
            content.richText = parseRichText(content.rich_text);
            delete content.rich_text;
        }
        if (content.caption) {
            content.caption = parseRichText(content.caption);
        }
        if (type === 'table_row' && content.cells) {
            content.cells = content.cells.map((cell: any[]) => parseRichText(cell));
        }
        return content;
    }
    return {};
}

async function parseNotionBlocks(pageId: string): Promise<any[]> {
    console.log(`🚀 Starting to parse blocks for page: ${pageId}`);

    const topLevelBlocks = await fetchBlockChildren(pageId);
    console.log(`📄 Got ${topLevelBlocks.length} top-level blocks`);

    if (topLevelBlocks.length === 0) {
        console.log(`⚠️ No top-level blocks found for page: ${pageId}`);
        return [];
    }

    const childFetchPromises: Promise<any>[] = [];
    const blocksWithChildrenIds: string[] = [];

    for (const block of topLevelBlocks) {
        if (block.has_children) {
            console.log(`🔗 Block ${block.id} has children, adding to fetch queue`);
            childFetchPromises.push(fetchBlockChildren(block.id));
            blocksWithChildrenIds.push(block.id);
        }
    }

    console.log(`📦 Fetching children for ${blocksWithChildrenIds.length} blocks with children`);
    const allChildrenResults = await Promise.all(childFetchPromises);

    const childrenMap: { [key: string]: any[] } = {};
    blocksWithChildrenIds.forEach((id, index) => {
        childrenMap[id] = allChildrenResults[index];
        console.log(`📋 Mapped ${allChildrenResults[index].length} children to block ${id}`);
    });

    const parseAndAssemble = (blocks: any[]): any[] => {
        console.log(`🔧 Parsing and assembling ${blocks.length} blocks`);

        return blocks.map(block => {
            const parsedBlock: any = {
                id: block.id,
                type: block.type,
                hasChildren: block.has_children,
                content: parseBlockContent(block),
                children: [],
            };

            if (childrenMap[block.id]) {
                console.log(`🔗 Adding ${childrenMap[block.id].length} children to block ${block.id}`);
                parsedBlock.children = parseAndAssemble(childrenMap[block.id]);
            }

            if (parsedBlock.type === 'table') {
                console.log(`📊 Sorting table block: ${block.id}`);
                return sortTableByPerformance(parsedBlock);
            }

            return parsedBlock;
        });
    };

    const result = parseAndAssemble(topLevelBlocks);
    console.log(`✅ Finished parsing blocks. Returning ${result.length} blocks`);
    return result;
}

// --- PURE NOTION GET METHOD ---
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const briefingIdParam = searchParams.get('briefingId');

    if (briefingIdParam) {
        console.log(`🚀 API called for specific briefingId: ${briefingIdParam}`);
        let notionId: string | null = null;
        let briefingRecord: any = null;

        // Step 1: Resolve Notion ID
        if (!isNaN(parseInt(briefingIdParam))) {
            const dbId = parseInt(briefingIdParam);
            console.log(`🔢 Identifier is a Database ID: ${dbId}, looking up Notion ID...`);
            try {
                const res = await pool.query('SELECT * FROM hedgefund_agent.briefings WHERE id = $1', [dbId]);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    notionId = briefingRecord.notion_page_id;
                    console.log(`✅ Found Notion ID: ${notionId} for DB ID: ${dbId}`);
                } else {
                    console.log(`❌ No database record found for DB ID: ${dbId}`);
                }
            } catch (e) {
                console.error(`❌ Database error fetching record for DB ID ${dbId}:`, e);
                return NextResponse.json({ error: 'Database error' }, { status: 500 });
            }
        } else {
            notionId = briefingIdParam;
            console.log(`🔗 Identifier is already a Notion ID: ${notionId}`);
        }

        if (!notionId) {
            console.error(`❌ Could not resolve Notion Page ID from identifier: ${briefingIdParam}`);
            return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
        }

        // Step 2: Always fetch from Notion (no cache)
        console.log(`📝 Fetching fresh content from Notion for: ${notionId}`);
        try {
            console.log(`🔍 Retrieving page properties...`);
            const pageResponse = await notion.pages.retrieve({ page_id: notionId });
            const page = pageResponse as any;

            if (!page.properties) {
                throw new Error(`Could not retrieve properties for Notion page ${notionId}`);
            }

            console.log(`📋 Properties retrieved successfully. Available properties:`, Object.keys(page.properties));

            console.log(`🔧 Starting block parsing...`);
            const content = await parseNotionBlocks(notionId);
            console.log(`✅ Block parsing complete. Generated ${content.length} content blocks`);

            const singleBriefing = {
                id: briefingRecord?.id || page.id,
                title: getTitle(page.properties.Name),
                period: getSelectValue(page.properties.Period),
                date: getDateValue(page.properties.Date),
                pageUrl: getUrlValue(page.properties['PDF Link']),
                tweetUrl: getUrlValue(page.properties['Tweet URL']),
                marketSentiment: getPlainText(page.properties['Market Sentiment']?.rich_text || []),
                content: content
            };

            console.log(`📤 Returning briefing:`, {
                id: singleBriefing.id,
                title: singleBriefing.title,
                period: singleBriefing.period,
                date: singleBriefing.date,
                contentBlocks: singleBriefing.content.length,
                marketSentiment: singleBriefing.marketSentiment
            });

            return NextResponse.json({ data: [singleBriefing] });

        } catch (err: any) {
            console.error(`❌ Error fetching from Notion (${notionId}):`, err);
            console.error(`❌ Error stack:`, err.stack);

            if (err.code === 'object_not_found') {
                return NextResponse.json({ error: 'Briefing not found in Notion' }, { status: 404 });
            }

            return NextResponse.json({
                error: 'Failed to fetch briefing content',
                details: err.message
            }, { status: 500 });
        }
    }

    // --- LIST VIEW (SIMPLIFIED - NO CONTENT PARSING) ---
    console.log('📋 API called for list of briefings');
    try {
        const databaseId = process.env.NOTION_PDF_DATABASE_ID!;
        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const startCursor = searchParams.get('cursor') || undefined;

        console.log(`📊 Querying Notion database: ${databaseId}`);
        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [{ property: 'Date', direction: 'descending' }],
            page_size: pageSize,
            start_cursor: startCursor
        });

        console.log(`📄 Retrieved ${response.results.length} briefings from Notion`);

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
                content: [] // Empty for list view - content loaded on demand
            };
        }).filter(Boolean);

        console.log(`✅ Processed ${briefings.length} briefings for list view`);

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