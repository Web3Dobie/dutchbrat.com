// frontend/app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { Pool } from 'pg';

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// --- HELPER FUNCTIONS (UNCHANGED) ---
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

// --- OPTIMIZED PARSING LOGIC ---
async function fetchBlockChildren(blockId: string): Promise<any[]> {
    try {
        const response = await notion.blocks.children.list({ block_id: blockId, page_size: 100 });
        return response.results;
    } catch (error) {
        console.error(`Failed to fetch children for block ${blockId}:`, error);
        return [];
    }
}
function parseBlockContent(block: any): any {
    const type = block.type;
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
    const topLevelBlocks = await fetchBlockChildren(pageId);
    const childFetchPromises: Promise<any>[] = [];
    const blocksWithChildrenIds: string[] = [];
    for (const block of topLevelBlocks) {
        if (block.has_children) {
            childFetchPromises.push(fetchBlockChildren(block.id));
            blocksWithChildrenIds.push(block.id);
        }
    }
    const allChildrenResults = await Promise.all(childFetchPromises);
    const childrenMap: { [key: string]: any[] } = {};
    blocksWithChildrenIds.forEach((id, index) => {
        childrenMap[id] = allChildrenResults[index];
    });
    const parseAndAssemble = (blocks: any[]): any[] => {
        return blocks.map(block => {
            const parsedBlock: any = {
                id: block.id,
                type: block.type,
                hasChildren: block.has_children,
                content: parseBlockContent(block),
                children: [],
            };
            if (childrenMap[block.id]) {
                parsedBlock.children = parseAndAssemble(childrenMap[block.id]);
            }
            if (parsedBlock.type === 'table') {
                return sortTableByPerformance(parsedBlock);
            }
            return parsedBlock;
        });
    };
    return parseAndAssemble(topLevelBlocks);
}

// --- UNIFIED GET METHOD ---
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const briefingIdParam = searchParams.get('briefingId');

    if (briefingIdParam) {
        console.log(`🚀 API called for specific briefingId: ${briefingIdParam}`);
        let dbId: number | null = null;
        let notionId: string | null = null;
        let briefingRecord: any = null;

        if (!isNaN(parseInt(briefingIdParam))) {
            dbId = parseInt(briefingIdParam);
            console.log(`Identifier is a Database ID: ${dbId}`);
            try {
                const res = await pool.query('SELECT * FROM hedgefund_agent.briefings WHERE id = $1', [dbId]);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    notionId = briefingRecord.notion_page_id;
                }
            } catch (e) {
                console.error(`Database error fetching record for DB ID ${dbId}:`, e);
                return NextResponse.json({ error: 'Database error' }, { status: 500 });
            }
        } else {
            notionId = briefingIdParam;
            console.log(`Identifier is a Notion ID: ${notionId}`);
            try {
                const res = await pool.query('SELECT * FROM hedgefund_agent.briefings WHERE notion_page_id = $1', [notionId]);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                }
            } catch (e) {
                console.warn(`Could not find a DB record for Notion ID ${notionId}, proceeding without cache.`);
            }
        }

        if (!notionId) {
            console.error(`Could not resolve a Notion Page ID from the provided identifier: ${briefingIdParam}`);
            return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
        }

        if (briefingRecord && briefingRecord.json_content) {
            console.log(`✅ Returning fast response from DATABASE CACHE for Notion ID: ${notionId}`);
            return NextResponse.json({ data: [briefingRecord.json_content] });
        }

        console.log(`⚠️ Cache miss for Notion ID ${notionId}. Fetching from Notion.`);
        try {
            const pageResponse = await notion.pages.retrieve({ page_id: notionId });
            const page = pageResponse as any;
            if (!page.properties) {
                throw new Error(`Could not retrieve properties for Notion page ${notionId}`);
            }
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
            console.error(`Error fetching specific briefing from Notion (${notionId}):`, err)
            return NextResponse.json({ error: err.message }, { status: 404, statusText: 'Not Found in Notion' });
        }
    }

    console.log('🚀 API called for list of briefings');
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

        const briefingsPromises = response.results.map(async (result) => {
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
                content: await parseNotionBlocks(page.id)
            };
        });

        const briefings = (await Promise.all(briefingsPromises)).filter(Boolean);
        return NextResponse.json({
            data: briefings,
            pagination: { hasMore: response.has_more, nextCursor: response.next_cursor }
        });

    } catch (err: any) {
        console.error('Error fetching briefings list:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

