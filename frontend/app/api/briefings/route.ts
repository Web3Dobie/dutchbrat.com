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

// --- NEW: ENHANCED CACHE-FIRST LOGIC ---
async function getCachedBriefing(briefingRecord: any): Promise<any | null> {
    if (!briefingRecord || !briefingRecord.json_content) {
        return null;
    }

    try {
        // If json_content is already parsed object, return it
        if (typeof briefingRecord.json_content === 'object') {
            console.log(`📋 Cache hit - returning parsed object from database`);
            return briefingRecord.json_content;
        }

        // If json_content is string, parse it
        if (typeof briefingRecord.json_content === 'string') {
            console.log(`📋 Cache hit - parsing JSON string from database`);
            return JSON.parse(briefingRecord.json_content);
        }

        console.log(`⚠️ Cache data in unexpected format: ${typeof briefingRecord.json_content}`);
        return null;

    } catch (error) {
        console.error(`❌ Failed to parse cached content:`, error);
        return null;
    }
}

async function fetchFromNotionWithCache(briefingRecord: any, notionId: string): Promise<any> {
    console.log(`🔄 Fetching fresh content from Notion for: ${notionId}`);

    try {
        // Fetch from Notion (using working logic)
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

        // Cache the result if we have a database record
        if (briefingRecord?.id) {
            try {
                console.log(`💾 Caching fresh content to database for briefing ID: ${briefingRecord.id}`);
                await pool.query(
                    'UPDATE hedgefund_agent.briefings SET json_content = $1 WHERE id = $2',
                    [JSON.stringify(singleBriefing), briefingRecord.id]
                );
                console.log(`✅ Successfully cached content for briefing ID: ${briefingRecord.id}`);
            } catch (cacheError) {
                console.error(`⚠️ Failed to cache content (non-critical):`, cacheError);
                // Don't fail the request if caching fails
            }
        }

        return singleBriefing;

    } catch (error) {
        console.error(`❌ Failed to fetch from Notion:`, error);
        throw error;
    }
}

// --- ENHANCED GET METHOD WITH CACHE-FIRST LOGIC ---
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const briefingIdParam = searchParams.get('briefingId');

    if (briefingIdParam) {
        console.log(`🚀 API called for specific briefingId: ${briefingIdParam}`);
        let dbId: number | null = null;
        let notionId: string | null = null;
        let briefingRecord: any = null;

        // Step 1: Resolve briefing record and Notion ID
        if (!isNaN(parseInt(briefingIdParam))) {
            dbId = parseInt(briefingIdParam);
            console.log(`🔢 Identifier is a Database ID: ${dbId}`);
            try {
                const res = await pool.query('SELECT * FROM hedgefund_agent.briefings WHERE id = $1', [dbId]);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    notionId = briefingRecord.notion_page_id;
                    console.log(`✅ Found database record: DB ID ${dbId} -> Notion ID ${notionId}`);
                } else {
                    console.log(`❌ No database record found for DB ID: ${dbId}`);
                }
            } catch (e) {
                console.error(`❌ Database error fetching record for DB ID ${dbId}:`, e);
                return NextResponse.json({ error: 'Database error' }, { status: 500 });
            }
        } else {
            notionId = briefingIdParam;
            console.log(`🔗 Identifier is a Notion ID: ${notionId}`);
            try {
                const res = await pool.query('SELECT * FROM hedgefund_agent.briefings WHERE notion_page_id = $1', [notionId]);
                if (res.rows.length > 0) {
                    briefingRecord = res.rows[0];
                    console.log(`✅ Found database record for Notion ID: ${notionId}`);
                } else {
                    console.log(`⚠️ No database record found for Notion ID: ${notionId} (proceeding with Notion-only)`);
                }
            } catch (e) {
                console.warn(`⚠️ Database lookup failed for Notion ID ${notionId}:`, e);
                // Continue without database record
            }
        }

        if (!notionId) {
            console.error(`❌ Could not resolve Notion Page ID from identifier: ${briefingIdParam}`);
            return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
        }

        // Step 2: Try cache first (PRIMARY)
        const cachedBriefing = await getCachedBriefing(briefingRecord);
        if (cachedBriefing) {
            console.log(`⚡ FAST RESPONSE - Returning cached content for: ${notionId}`);
            return NextResponse.json({ data: [cachedBriefing] });
        }

        // Step 3: Fallback to Notion (SECONDARY)
        console.log(`🐌 SLOW RESPONSE - Cache miss, fetching from Notion: ${notionId}`);
        try {
            const freshBriefing = await fetchFromNotionWithCache(briefingRecord, notionId);
            console.log(`✅ Successfully fetched and returning fresh content`);
            return NextResponse.json({ data: [freshBriefing] });

        } catch (err: any) {
            console.error(`❌ Error fetching from Notion (${notionId}):`, err);

            if (err.code === 'object_not_found') {
                return NextResponse.json({ error: 'Briefing not found in Notion' }, { status: 404 });
            }

            return NextResponse.json({
                error: 'Failed to fetch briefing content',
                details: err.message
            }, { status: 500 });
        }
    }

    // --- LIST VIEW (UNCHANGED - WORKING LOGIC PRESERVED) ---
    console.log('📋 API called for list of briefings');
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

        // For list view, we don't parse content (keep it fast)
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