// app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { Pool } from 'pg';
import { getRedisService, BriefingData } from '../../../lib/redis';

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
    timeoutMs: 20000
});

const pool = new Pool({
    host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || process.env.DB_NAME || 'agents_platform',
    user: process.env.POSTGRES_USER || process.env.DB_USER || 'hunter_admin',
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    ssl: false
});
const redis = getRedisService();

// --- HELPER FUNCTIONS ---
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
        annotations: item.annotations || {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default'
        },
        href: item.href || item.text?.link?.url || null
    })).filter(item => item.text !== ''); // Remove empty text items
}

// --- NOTION BLOCK PARSING ---
async function parseNotionBlocks(pageId: string): Promise<any[]> {
    const allBlocks: any[] = [];
    let cursor: string | undefined = undefined;

    do {
        const response: any = await notion.blocks.children.list({
            block_id: pageId,
            start_cursor: cursor,
            page_size: 100
        });
        allBlocks.push(...response.results);
        cursor = response.next_cursor || undefined;
    } while (cursor);

    const childrenMap: Record<string, any[]> = {};
    const topLevelBlocks: any[] = [];

    for (const block of allBlocks) {
        if (block.has_children && block.type !== 'column_list' && block.type !== 'table') {
            const childCursor: string | undefined = undefined;
            const childBlocks: any[] = [];
            let childCursorLoop = childCursor;
            do {
                const childResponse: any = await notion.blocks.children.list({
                    block_id: block.id,
                    start_cursor: childCursorLoop,
                    page_size: 100
                });
                childBlocks.push(...childResponse.results);
                childCursorLoop = childResponse.next_cursor || undefined;
            } while (childCursorLoop);

            childrenMap[block.id] = childBlocks;
        }
    }

    for (const block of allBlocks) {
        const parentId = (block as any).parent?.block_id;
        if (!parentId || !allBlocks.some(b => b.id === parentId)) {
            topLevelBlocks.push(block);
        }
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
        const headerRow = hasHeader ? [tableBlock.children[0]] : [];
        const dataRows = tableBlock.children.slice(dataRowsStartIndex);
        dataRows.sort((a, b) => {
            const cellA = a.content?.cells?.[changeColumnIndex];
            const cellB = b.content?.cells?.[changeColumnIndex];
            const numA = cleanAndParse(cellA);
            const numB = cleanAndParse(cellB);
            if (isNaN(numA) && isNaN(numB)) return 0;
            if (isNaN(numA)) return 1;
            if (isNaN(numB)) return -1;
            return numB - numA;
        });
        tableBlock.children = [...headerRow, ...dataRows];
        return tableBlock;
    }

    const assembleBlocks = (blocks: any[]): any[] => {
        return blocks.map(block => {
            const baseBlock = { id: block.id, type: block.type, hasChildren: block.has_children };
            let children: any[] = [];
            if (childrenMap[block.id]) {
                children = assembleBlocks(childrenMap[block.id]);
            }
            let content: any = {};
            switch (block.type) {
                case 'paragraph': content = { richText: parseRichText(block.paragraph.rich_text) }; break;
                case 'heading_1': content = { richText: parseRichText(block.heading_1.rich_text) }; break;
                case 'heading_2': content = { richText: parseRichText(block.heading_2.rich_text) }; break;
                case 'heading_3': content = { richText: parseRichText(block.heading_3.rich_text) }; break;
                case 'bulleted_list_item': content = { richText: parseRichText(block.bulleted_list_item.rich_text) }; break;
                case 'numbered_list_item': content = { richText: parseRichText(block.numbered_list_item.rich_text) }; break;
                case 'to_do': content = { richText: parseRichText(block.to_do.rich_text), checked: block.to_do.checked }; break;
                case 'toggle': content = { richText: parseRichText(block.toggle.rich_text) }; break;
                case 'code': content = { richText: parseRichText(block.code.rich_text), language: block.code.language }; break;
                case 'quote': content = { richText: parseRichText(block.quote.rich_text) }; break;
                case 'callout': content = { richText: parseRichText(block.callout.rich_text), icon: block.callout.icon }; break;
                case 'divider': content = {}; break;
                case 'table': content = { tableWidth: block.table.table_width, hasColumnHeader: block.table.has_column_header, hasRowHeader: block.table.has_row_header }; break;
                case 'table_row': content = { cells: block.table_row?.cells.map((cell: any[]) => parseRichText(cell)) || [] }; break;
                case 'image': content = { url: block.image.file?.url || block.image.external?.url, caption: parseRichText(block.image.caption || []) }; break;
                case 'video': content = { url: block.video.file?.url || block.video.external?.url, caption: parseRichText(block.video.caption || []) }; break;
                case 'file': content = { url: block.file.file?.url || block.file.external?.url, caption: parseRichText(block.file.caption || []) }; break;
                case 'bookmark': content = { url: block.bookmark.url, caption: parseRichText(block.bookmark.caption || []) }; break;
                case 'embed': content = { url: block.embed.url, caption: parseRichText(block.embed.caption || []) }; break;
                case 'column_list': content = {}; break;
                case 'column': content = {}; break;
                default: content = { unsupported: true, originalType: block.type }; break;
            }
            const parsedBlock = { ...baseBlock, content, children };
            if (parsedBlock.type === 'table') {
                return sortTableByPerformance(parsedBlock);
            }
            return parsedBlock;
        });
    };
    return assembleBlocks(topLevelBlocks);
}

/**
 * Backfill a briefing from Notion (when json_content is NULL)
 * CRITICAL FIX: Use database integer ID, not Notion UUID
 */
async function backfillBriefingFromNotion(dbId: number, notionPageId: string): Promise<BriefingData> {
    console.log(`Backfilling briefing ${dbId} from Notion: ${notionPageId}`);

    try {
        const content = await parseNotionBlocks(notionPageId);
        const pageResponse = await notion.pages.retrieve({ page_id: notionPageId });
        const page = pageResponse as any;

        if (!page.properties) {
            throw new Error(`Could not retrieve properties for Notion page ${notionPageId}`);
        }

        const briefingData: BriefingData = {
            id: dbId.toString(), // CRITICAL: Use database ID, not Notion ID
            title: getTitle(page.properties.Name),
            period: getSelectValue(page.properties.Period),
            date: getDateValue(page.properties.Date),
            pageUrl: getUrlValue(page.properties['PDF Link']),
            tweetUrl: getUrlValue(page.properties['Tweet URL']),
            marketSentiment: getPlainText(page.properties['Market Sentiment']?.rich_text || []),
            content: content
        };

        // Save to PostgreSQL
        await pool.query(
            `UPDATE hedgefund_agent.briefings 
             SET json_content = $1 
             WHERE id = $2`,
            [JSON.stringify(briefingData), dbId]
        );

        console.log(`Backfilled briefing ${dbId} to database`);

        // Cache in Redis
        await redis.setBriefing(dbId, notionPageId, briefingData);

        return briefingData;
    } catch (error) {
        console.error(`Failed to backfill briefing ${dbId}:`, error);
        throw error;
    }
}

/**
 * Get tree metadata (Year -> Month -> Date structure)
 */
async function getTreeMetadata(): Promise<any> {
    const REDIS_KEY = 'briefings:tree-metadata';

    const cached = await redis.get(REDIS_KEY);
    if (cached) {
        console.log('Tree metadata cache HIT');
        return JSON.parse(cached);
    }

    console.log('Tree metadata cache MISS, querying database');

    const result = await pool.query(`
        SELECT 
            EXTRACT(YEAR FROM published_at)::INTEGER as year,
            EXTRACT(MONTH FROM published_at)::INTEGER as month,
            TO_CHAR(published_at, 'YYYY-MM-DD') as date,
            COUNT(*)::INTEGER as count
        FROM hedgefund_agent.briefings
        WHERE published_at IS NOT NULL
        GROUP BY year, month, date
        ORDER BY year DESC, month DESC, date DESC
    `);

    const tree: Record<number, Record<string, Record<string, number>>> = {};

    for (const row of result.rows) {
        const year = row.year;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthStr = monthNames[row.month - 1];
        const dateStr = row.date; // Now "2025-10-06" format

        if (!tree[year]) tree[year] = {};
        if (!tree[year][monthStr]) tree[year][monthStr] = {};
        tree[year][monthStr][dateStr] = row.count;
    }

    await redis.setex(REDIS_KEY, 3600, JSON.stringify(tree));

    console.log(`Built tree with ${Object.keys(tree).length} years`);
    return tree;
}

/**
 * Get briefings for a specific date
 * CRITICAL FIX: Override ID with database integer
 */
async function getBriefingsByDate(date: string): Promise<BriefingData[]> {
    const REDIS_KEY = `briefings:by-date:${date}`;

    const cached = await redis.get(REDIS_KEY);
    if (cached) {
        console.log(`Briefings for ${date} cache HIT`);
        return JSON.parse(cached);
    }

    console.log(`Briefings for ${date} cache MISS, querying database`);

    const result = await pool.query(`
        SELECT id, title, briefing_type, notion_page_id, 
               website_url, tweet_url, published_at, json_content
        FROM hedgefund_agent.briefings
        WHERE DATE(published_at) = $1
        ORDER BY published_at ASC
    `, [date]);

    const briefings: BriefingData[] = [];

    for (const row of result.rows) {
        if (row.json_content) {
            const parsed = typeof row.json_content === 'string'
                ? JSON.parse(row.json_content)
                : row.json_content;

            parsed.id = row.id.toString();
            briefings.push(parsed);
        } else {
            try {
                const briefingData = await backfillBriefingFromNotion(row.id, row.notion_page_id);
                briefings.push(briefingData);
            } catch (error) {
                console.error(`Failed to backfill briefing ${row.id}, skipping`);
            }
        }
    }

    await redis.setex(REDIS_KEY, 1800, JSON.stringify(briefings));

    return briefings;
}

/**
 * Get single briefing by ID
 * CRITICAL FIX: Override ID with database integer
 */
async function getSingleBriefing(briefingIdParam: string): Promise<BriefingData> {
    let dbId: number | null = null;
    let notionId: string | null = null;
    let briefingRecord: any = null;

    try {
        if (!isNaN(parseInt(briefingIdParam))) {
            dbId = parseInt(briefingIdParam);
            const res = await pool.query(
                'SELECT * FROM hedgefund_agent.briefings WHERE id = $1',
                [dbId]
            );
            if (res.rows.length > 0) {
                briefingRecord = res.rows[0];
                notionId = briefingRecord.notion_page_id;
            }
        } else {
            notionId = briefingIdParam;
            const res = await pool.query(
                'SELECT * FROM hedgefund_agent.briefings WHERE notion_page_id = $1',
                [notionId]
            );
            if (res.rows.length > 0) {
                briefingRecord = res.rows[0];
                dbId = briefingRecord.id;
            }
        }
    } catch (e) {
        console.error(`Database error during ID lookup for ${briefingIdParam}:`, e);
        throw new Error('Database error');
    }

    if (!notionId || !briefingRecord) {
        throw new Error('Briefing not found');
    }

    if (dbId) {
        const cachedBriefing = await redis.getBriefing(dbId);
        if (cachedBriefing) {
            console.log(`REDIS cache HIT for briefing ${briefingIdParam}`);
            return cachedBriefing;
        }
    }

    console.log(`Cache miss for briefing ${briefingIdParam}`);

    if (briefingRecord.json_content) {
        console.log(`Using json_content from database for briefing ${dbId}`);
        const briefingData = typeof briefingRecord.json_content === 'string'
            ? JSON.parse(briefingRecord.json_content)
            : briefingRecord.json_content;

        // CRITICAL: Override ID with database integer
        briefingData.id = dbId!.toString();

        if (dbId) {
            await redis.setBriefing(dbId, notionId, briefingData);
        }

        return briefingData;
    }

    console.log(`json_content is NULL, backfilling from Notion for briefing ${dbId}`);
    return await backfillBriefingFromNotion(dbId!, notionId);
}

// MAIN GET HANDLER
export async function GET(req: NextRequest) {
    console.log("--- API VERSION: PostgreSQL-First v3.0 ---");

    const { searchParams } = new URL(req.url);
    const briefingIdParam = searchParams.get('briefingId');
    const treeMetadata = searchParams.get('tree-metadata');
    const dateParam = searchParams.get('date');

    try {
        if (treeMetadata === 'true') {
            console.log('Tree metadata requested');
            const tree = await getTreeMetadata();
            return NextResponse.json({ tree });
        }

        if (dateParam) {
            console.log(`Briefings for date ${dateParam} requested`);
            const briefings = await getBriefingsByDate(dateParam);
            return NextResponse.json({ data: briefings });
        }

        if (briefingIdParam) {
            console.log(`Single briefing requested: ${briefingIdParam}`);
            const briefingData = await getSingleBriefing(briefingIdParam);
            return NextResponse.json({ data: [briefingData] });
        }

        // DEFAULT: Return recent briefings
        console.log('Recent briefings list requested (legacy mode)');
        console.log('About to execute PostgreSQL query...');

        const result = await pool.query(`
            SELECT id, title, briefing_type, notion_page_id, 
                   website_url as "pageUrl", tweet_url as "tweetUrl", 
                   created_at, json_content
            FROM hedgefund_agent.briefings
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log(`PostgreSQL query returned ${result.rows.length} rows`);

        const briefings: BriefingData[] = [];

        for (const row of result.rows) {
            if (row.json_content) {
                const parsed = typeof row.json_content === 'string'
                    ? JSON.parse(row.json_content)
                    : row.json_content;

                // CRITICAL: Override ID with database integer
                parsed.id = row.id.toString();

                console.log(`Using json_content from database for briefing ${row.id}`);
                briefings.push(parsed);
            } else {
                try {
                    const briefingData = await backfillBriefingFromNotion(row.id, row.notion_page_id);
                    briefings.push(briefingData);
                } catch (error) {
                    console.error(`Failed to backfill briefing ${row.id}`);
                }
            }
        }

        return NextResponse.json({
            data: briefings,
            pagination: { hasMore: false, nextCursor: null }
        });

    } catch (err: any) {
        console.error('Error in briefings API:', err);
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        );
    }
}