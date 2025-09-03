// frontend/app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { Pool } from 'pg'; // <-- NEW: Import the PostgreSQL client

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// --- NEW: Setup connection pool to your PostgreSQL database ---
// It's recommended to use environment variables for your database connection details
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, // e.g., postgres://user:password@host:port/database
});
// --- END NEW ---


// Helper function to extract plain text from Notion rich text
function getPlainText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    return richText.map(item => item.plain_text || '').join('');
}

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

// Parse Notion rich text to our format
function parseRichText(richText: any[]): any[] {
    if (!richText || !Array.isArray(richText)) return [];

    return richText.map(item => ({
        type: 'text',
        text: item.plain_text || item.text?.content || '',  // Handle both formats
        annotations: {
            bold: item.annotations?.bold || false,
            italic: item.annotations?.italic || false,
            strikethrough: item.annotations?.strikethrough || false,
            underline: item.annotations?.underline || false,
            code: item.annotations?.code || false,
            color: item.annotations?.color || 'default'
        },
        href: item.href || item.text?.link?.url || null
    }));
}

/**
 * Sorts the rows of a parsed table block based on the performance column (e.g., % change or bps change),
 * by automatically detecting the presence of a header row.
 * @param tableBlock A parsed table block with its children (rows).
 * @returns The same table block with its children sorted.
 */
function sortTableByPerformance(tableBlock: any): any {
    if (!tableBlock || tableBlock.type !== 'table' || !tableBlock.children || tableBlock.children.length < 1) {
        return tableBlock;
    }

    let changeColumnIndex = -1;
    let headerDetected = false;

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

    // Heuristic to find the performance column and detect a header
    if (tableBlock.children.length >= 2) {
        // Assume the second row (index 1) is the first data row and find the column there
        changeColumnIndex = findPerfColumn(tableBlock.children[1]);

        if (changeColumnIndex !== -1) {
            // Now check the first row in that same column. If it's not a number, it's a header.
            const firstRowValue = cleanAndParse(tableBlock.children[0]?.content?.cells[changeColumnIndex]);
            if (isNaN(firstRowValue)) {
                headerDetected = true;
            }
        }
    }
    
    // Fallback for tables with no header (or only one row)
    if (changeColumnIndex === -1 && tableBlock.children.length > 0) {
        changeColumnIndex = findPerfColumn(tableBlock.children[0]);
        headerDetected = false; 
    }

    // If we still can't find a performance column, give up and return the original table.
    if (changeColumnIndex === -1) {
        return tableBlock;
    }

    // Separate header from data rows, sort the data rows, then recombine.
    const headerRow = headerDetected ? tableBlock.children.slice(0, 1) : [];
    const dataRows = headerDetected ? tableBlock.children.slice(1) : tableBlock.children;

    dataRows.sort((rowA: any, rowB: any) => {
        const valueA = cleanAndParse(rowA?.content?.cells[changeColumnIndex]);
        const valueB = cleanAndParse(rowB?.content?.cells[changeColumnIndex]);
        
        if (isNaN(valueA) || isNaN(valueB)) {
            return 0;
        }
        // Sort descending (highest value first)
        return valueB - valueA;
    });
    
    tableBlock.children = [...headerRow, ...dataRows];
    return tableBlock;
}

// Simple parser for children blocks (non-recursive to improve performance)
function parseBlockSimple(block: any): any | null {
    const baseBlock = {
        id: block.id,
        type: block.type,
        hasChildren: block.has_children
    };

    switch (block.type) {
        case 'table_row':
            return {
                ...baseBlock,
                content: {
                    cells: block.table_row?.cells.map((cell: any[]) => parseRichText(cell)) || []
                }
            };

        case 'paragraph':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.paragraph?.rich_text || [])
                }
            };

        case 'embed':
            return {
                ...baseBlock,
                content: {
                    url: block.embed.url,
                    caption: parseRichText(block.embed.caption || [])
                }
            };

        case 'callout':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.callout.rich_text),
                    icon: block.callout.icon
                }
            };

        default:
            return {
                ...baseBlock,
                content: {
                    unsupported: true,
                    originalType: block.type
                }
            };
    }
}

// Parse Notion blocks recursively
async function parseNotionBlocks(pageId: string): Promise<any[]> {
    try {
        console.log('Fetching blocks for page:', pageId);

        const blocks = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100
        });

        console.log('Total blocks received:', blocks.results.length);
        console.log('Block types:', blocks.results.map((b: any) => b.type));

        const parsedBlocksPromises = blocks.results.map(block => parseBlock(block as any));
        const parsedBlocks = (await Promise.all(parsedBlocksPromises)).filter(Boolean);

        console.log('Parsed blocks count:', parsedBlocks.length);
        return parsedBlocks;
    } catch (error) {
        console.error('Error parsing Notion blocks:', error);
        return [];
    }
}

// Parse individual Notion block
async function parseBlock(block: any): Promise<any | null> {
    const baseBlock = {
        id: block.id,
        type: block.type,
        hasChildren: block.has_children
    };

    // Update this to also fetch children for columns
    let children: any[] = [];
    if (block.has_children && (
        block.type === 'table' ||
        block.type === 'toggle' ||
        block.type === 'column_list' || // <-- Add this
        block.type === 'column'        // <-- Add this
    )) {
        try {
            const childrenResponse = await notion.blocks.children.list({
                block_id: block.id,
                page_size: 100
            });

            for (const child of childrenResponse.results) {
                const parsedChild = await parseBlock(child as any);
                if (parsedChild) {
                    children.push(parsedChild);
                }
            }
        } catch (error) {
            console.error(`Error fetching children for block ${block.id}:`, error);
        }
    }

    switch (block.type) {
        case 'paragraph':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.paragraph.rich_text)
                }
            };

        case 'heading_1':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.heading_1.rich_text)
                }
            };

        case 'heading_2':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.heading_2.rich_text)
                }
            };

        case 'heading_3':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.heading_3.rich_text)
                }
            };

        case 'bulleted_list_item':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.bulleted_list_item.rich_text)
                }
            };

        case 'numbered_list_item':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.numbered_list_item.rich_text)
                }
            };

        case 'to_do':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.to_do.rich_text),
                    checked: block.to_do.checked
                }
            };

        case 'toggle':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.toggle.rich_text)
                },
                children: children
            };

        case 'code':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.code.rich_text),
                    language: block.code.language
                }
            };

        case 'quote':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.quote.rich_text)
                }
            };

        case 'callout':
            return {
                ...baseBlock,
                content: {
                    richText: parseRichText(block.callout.rich_text),
                    icon: block.callout.icon
                }
            };

        case 'divider':
            return {
                ...baseBlock,
                content: {}
            };

        case 'table':
            const table = {
                ...baseBlock,
                content: {
                    tableWidth: block.table.table_width,
                    hasColumnHeader: block.table.has_column_header,
                    hasRowHeader: block.table.has_row_header
                },
                children: children // These are the table_row blocks
            };
            // --- MODIFICATION: Sort the table before returning ---
            return sortTableByPerformance(table);

        case 'table_row':
            return {
                ...baseBlock,
                content: {
                    cells: block.table_row?.cells.map((cell: any[]) => parseRichText(cell)) || []
                }
            };

        case 'image':
            return {
                ...baseBlock,
                content: {
                    url: block.image.file?.url || block.image.external?.url,
                    caption: parseRichText(block.image.caption || [])
                }
            };

        case 'video':
            return {
                ...baseBlock,
                content: {
                    url: block.video.file?.url || block.video.external?.url,
                    caption: parseRichText(block.video.caption || [])
                }
            };

        case 'file':
            return {
                ...baseBlock,
                content: {
                    url: block.file.file?.url || block.file.external?.url,
                    caption: parseRichText(block.file.caption || [])
                }
            };

        case 'bookmark':
            return {
                ...baseBlock,
                content: {
                    url: block.bookmark.url,
                    caption: parseRichText(block.bookmark.caption || [])
                }
            };

        case 'embed':
            return {
                ...baseBlock,
                content: {
                    url: block.embed.url,
                    caption: parseRichText(block.embed.caption || [])
                }
            };

        case 'column_list':
            return {
                ...baseBlock,
                children: children // The children will be the individual 'column' blocks
            };

        case 'column':
            return {
                ...baseBlock,
                children: children // The children will be the content inside the column (headings, tables, etc.)
            };

        default:
            return {
                ...baseBlock,
                content: {
                    unsupported: true,
                    originalType: block.type
                }
            };
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const briefingId = searchParams.get('briefingId');

    // --- CASE 1: A SPECIFIC BRIEFING ID IS PROVIDED ---
    // This is used by the Python caching script and when linking to a specific briefing.
    if (briefingId) {
        console.log(`🚀 API called for specific briefingId: ${briefingId}`);

        // 1. Try to fetch from the database cache first
        try {
            const result = await pool.query(
                // IMPORTANT: Ensure your table has a 'notion_page_id' column
                'SELECT json_content FROM briefings WHERE notion_page_id = $1', 
                [briefingId]
            );

            if (result.rows.length > 0 && result.rows[0].json_content) {
                console.log(`✅ Returning fast response from DATABASE CACHE for briefing: ${briefingId}`);
                return NextResponse.json({ data: [result.rows[0].json_content] });
            }
        } catch (e) {
            console.warn('Database cache fetch failed, falling back to Notion API:', e);
        }

        // 2. If not in cache, fetch this specific page from Notion and parse it on-demand.
        console.log(`⚠️ Cache miss for ${briefingId}. Fetching from Notion.`);
        try {
            const content = await parseNotionBlocks(briefingId);
            const pageResponse = await notion.pages.retrieve({ page_id: briefingId });
            const page = pageResponse as any;

            if (!page.properties) {
                throw new Error(`Could not retrieve properties for Notion page ${briefingId}`);
            }

            const properties = page.properties;
            const singleBriefing = {
                id: page.id,
                title: getTitle(properties.Name),
                period: getSelectValue(properties.Period),
                date: getDateValue(properties.Date),
                pageUrl: getUrlValue(properties['PDF Link']),
                tweetUrl: getUrlValue(properties['Tweet URL']),
                marketSentiment: getPlainText(properties['Market Sentiment']?.rich_text || []),
                content: content
            };

            return NextResponse.json({ data: [singleBriefing] });

        } catch (err: any) {
             console.error(`Error fetching specific briefing ${briefingId} from Notion:`, err)
             return NextResponse.json({ error: err.message }, { status: 500 });
        }
    }

    // --- CASE 2: NO BRIEFING ID IS PROVIDED ---
    // This is the general case for browsing the main briefings page.
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
