// frontend/app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { Pool } from 'pg';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// --- COMPLETE HELPER FUNCTIONS ---
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
        annotations: item.annotations || { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        href: item.href || item.text?.link?.url || null
    }));
}
function sortTableByPerformance(tableBlock: any): any {
    if (tableBlock.type !== 'table' || !tableBlock.children || tableBlock.children.length < 1) {
        return tableBlock;
    }
    const hasHeader = tableBlock.content?.hasColumnHeader;
    const dataRowsStartIndex = hasHeader ? 1 : 0;
    if (tableBlock.children.length <= dataRowsStartIndex) {
        return tableBlock;
    }
    const findPerfColumn = (row: any): number => {
        const cells = row?.content?.cells;
        if (!cells) return -1;
        for (let i = 0; i < cells.length; i++) {
            const cellText = getPlainText(cells[i]).toLowerCase();
            if (cellText.includes('%') || cellText.includes('bps')) {
                return i;
            }
        }
        return -1;
    };
    const cleanAndParse = (cell: any): number => {
        if (!cell) return NaN;
        const text = getPlainText(cell);
        const cleanedText = text.replace('%', '').replace(/bps/i, '').trim();
        return parseFloat(cleanedText);
    };
    const changeColumnIndex = findPerfColumn(tableBlock.children[dataRowsStartIndex]);
    if (changeColumnIndex === -1) {
        return tableBlock;
    }
    const headerRow = hasHeader ? tableBlock.children.slice(0, 1) : [];
    const dataRows = tableBlock.children.slice(dataRowsStartIndex);
    dataRows.sort((rowA: any, rowB: any) => {
        const valueA = cleanAndParse(rowA?.content?.cells[changeColumnIndex]);
        const valueB = cleanAndParse(rowB?.content?.cells[changeColumnIndex]);
        if (isNaN(valueA) || isNaN(valueB)) return 0;
        return valueB - valueA;
    });
    tableBlock.children = [...headerRow, ...dataRows];
    return tableBlock;
}

// --- START OF FINAL, OPTIMIZED PARSING LOGIC ---
async function fetchBlockChildren(blockId: string): Promise<any[]> {
    try {
        const response = await notion.blocks.children.list({ block_id: blockId, page_size: 100 });
        return response.results;
    } catch (error) {
        console.error(`Failed to fetch children for block ${blockId}:`, error);
        return [];
    }
}

async function parseNotionBlocks(pageId: string): Promise<any[]> {
    // 1. Fetch the top-level blocks for the page.
    const topLevelBlocks = await fetchBlockChildren(pageId);
    if (topLevelBlocks.length === 0) return [];

    // 2. Recursively find all block IDs that have children.
    const childrenMap: { [key: string]: any[] } = {};
    const blocksWithChildrenIds = new Set<string>();

    const findChildrenRecursively = (blocks: any[]) => {
        for (const block of blocks) {
            if (block.has_children) {
                blocksWithChildrenIds.add(block.id);
            }
        }
    };
    findChildrenRecursively(topLevelBlocks);

    // 3. Fetch all children concurrently, level by level.
    let currentLevelIds = Array.from(blocksWithChildrenIds);
    while (currentLevelIds.length > 0) {
        const childFetchPromises = currentLevelIds.map(id => fetchBlockChildren(id));
        const results = await Promise.all(childFetchPromises);

        const nextLevelIds = new Set<string>();
        results.forEach((children, index) => {
            const parentId = currentLevelIds[index];
            childrenMap[parentId] = children;
            findChildrenRecursively(children); // Find grandchildren
        });

        // Prepare for the next loop if there are more nested children
        const fetchedIds = new Set(Object.keys(childrenMap));
        currentLevelIds = Array.from(blocksWithChildrenIds).filter(id => !fetchedIds.has(id));
    }

    // 4. Assemble the final nested structure from the pre-fetched children.
    const assembleBlocks = (blocks: any[]): any[] => {
        return blocks.map(block => {
            let children: any[] = [];
            if (childrenMap[block.id]) {
                children = assembleBlocks(childrenMap[block.id]);
            }
            let content: any = {};
            const type = block.type;
            if (block[type]) {
                content = { ...block[type] };
                if (content.rich_text) { content.richText = parseRichText(content.rich_text); delete content.rich_text; }
                if (content.caption) { content.caption = parseRichText(content.caption); }
                if (type === 'table_row' && content.cells) { content.cells = content.cells.map((cell: any[]) => parseRichText(cell)); }
            } else {
                content = { unsupported: true, originalType: type };
            }
            const parsedBlock = { id: block.id, type, hasChildren: block.has_children, content, children };
            if (parsedBlock.type === 'table') {
                return sortTableByPerformance(parsedBlock);
            }
            return parsedBlock;
        });
    };

    return assembleBlocks(topLevelBlocks);
}
// --- END OF FINAL PARSING LOGIC ---

// UNIFIED GET METHOD
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const briefingIdParam = searchParams.get('briefingId');
    let client;

    if (briefingIdParam) {
        try {
            client = await pool.connect();
            console.log(`🚀 API called for specific briefingId: ${briefingIdParam}`);
            let notionId: string | null = null;
            let briefingRecord: any = null;

            if (!isNaN(parseInt(briefingIdParam))) {
                const dbId = parseInt(briefingIdParam);
                const res = await client.query('SELECT * FROM hedgefund_agent.briefings WHERE id = $1', [dbId]);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    notionId = briefingRecord.notion_page_id;
                }
            } else {
                notionId = briefingIdParam;
                const res = await client.query('SELECT * FROM hedgefund_agent.briefings WHERE notion_page_id = $1', [notionId]);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                }
            }

            if (!notionId) {
                return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
            }

            if (briefingRecord && briefingRecord.json_content) {
                console.log(`✅ Returning fast response from DATABASE CACHE for Notion ID: ${notionId}`);
                return NextResponse.json({ data: [briefingRecord.json_content] });
            }

            console.log(`⚠️ Cache miss for Notion ID ${notionId}. Fetching from Notion.`);

            const pageResponse = await notion.pages.retrieve({ page_id: notionId });
            const page = pageResponse as any;
            if (!page.properties) { throw new Error(`Could not retrieve properties for Notion page ${notionId}`); }

            const content = await parseNotionBlocks(notionId);

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
            return NextResponse.json({ data: [singleBriefing] });

        } catch (err: any) {
            console.error(`Error processing specific briefing (${briefingIdParam}):`, err);
            if (err.code === 'object_not_found') {
                return NextResponse.json({ error: 'Not Found in Notion' }, { status: 404 });
            }
            if (err.message.includes('database') || err.message.includes('pool')) {
                return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
            }
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        } finally {
            client?.release();
        }
    }

    // --- List view for the main page ---
    try {
        console.log('🚀 API called for list of briefings');
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
            pagination: { hasMore: response.has_more, nextCursor: response.next_cursor }
        });
    } catch (err: any) {
        console.error('Error fetching briefings list:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

