// frontend/app/api/briefings/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

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

    // Only fetch children for tables (not toggles) to improve performance
    let children: any[] = [];
    if (block.has_children && (block.type === 'table' || block.type === 'toggle')) {
        try {
            const childrenResponse = await notion.blocks.children.list({
                block_id: block.id,
                page_size: 100
            });

            // Parse children (but don't recursively fetch their children to avoid deep nesting)
            for (const child of childrenResponse.results) {
                const parsedChild = await parseBlock(child as any); // Use the full parser
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
            return {
                ...baseBlock,
                content: {
                    tableWidth: block.table.table_width,
                    hasColumnHeader: block.table.has_column_header,
                    hasRowHeader: block.table.has_row_header
                },
                children: children
            };

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
    console.log('🚀 NEW BRIEFINGS API CALLED - with content parsing');

    try {
        const databaseId = process.env.NOTION_PDF_DATABASE_ID!

        if (!databaseId) {
            throw new Error('NOTION_PDF_DATABASE_ID environment variable not set')
        }

        // Get URL search parameters
        const { searchParams } = new URL(req.url);
        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const startCursor = searchParams.get('cursor') || undefined;

        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [
                {
                    property: 'Date',
                    direction: 'descending',
                },
            ],
            page_size: pageSize,
            start_cursor: startCursor
        })

        // Check if we have results
        if (!response.results || response.results.length === 0) {
            return NextResponse.json({
                data: [],
                pagination: {
                    hasMore: false,
                    nextCursor: null
                }
            });
        }

        // Transform each page one by one to avoid Promise.all type issues
        const briefingsPromises = response.results.map(async (result) => {
            const page = result as any;
            if (!page.properties) return null;

            const properties = page.properties;
            const content = await parseNotionBlocks(page.id);

            return {
                id: page.id,
                title: getTitle(properties.Name),
                period: getSelectValue(properties.Period),
                date: getDateValue(properties.Date),
                pageUrl: getUrlValue(properties['PDF Link']),
                tweetUrl: getUrlValue(properties['Tweet URL']),
                marketSentiment: getPlainText(properties['Market Sentiment']?.rich_text || []),
                content: content
            };
        });

        const briefings = (await Promise.all(briefingsPromises)).filter(Boolean); // .filter(Boolean) removes any nulls

        console.log(`Returning ${briefings.length} briefings with full content`);

        return NextResponse.json({
            data: briefings,
            pagination: {
                hasMore: response.has_more,
                nextCursor: response.next_cursor
            }
        });

    } catch (err: any) {
        console.error('Error fetching briefings with content:', err)
        return NextResponse.json(
            { error: err.message || 'Unknown error' },
            { status: 500 }
        )
    }
}