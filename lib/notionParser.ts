import { Client } from '@notionhq/client';

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
    timeoutMs: 20000
});

export interface RichTextItem {
    type: string;
    text: string;
    annotations: {
        bold: boolean;
        italic: boolean;
        strikethrough: boolean;
        underline: boolean;
        code: boolean;
        color: string;
    };
    href: string | null;
}

export interface NotionBlock {
    id: string;
    type: string;
    hasChildren: boolean;
    content: any;
    children: NotionBlock[];
}

export function getPlainText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    return richText.map(item => item.plain_text || item.text || '').join('');
}

export function parseRichText(richText: any[]): RichTextItem[] {
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
    })).filter(item => item.text !== '');
}

export async function parseNotionBlocks(pageId: string): Promise<NotionBlock[]> {
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
            const childBlocks: any[] = [];
            let childCursorLoop: string | undefined = undefined;
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

    const assembleBlocks = (blocks: any[]): NotionBlock[] => {
        return blocks.map(block => {
            const baseBlock = { id: block.id, type: block.type, hasChildren: block.has_children };
            let children: NotionBlock[] = [];
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
            return { ...baseBlock, content, children };
        });
    };
    return assembleBlocks(topLevelBlocks);
}

export async function getNotionPageTitle(pageId: string): Promise<string> {
    const page: any = await notion.pages.retrieve({ page_id: pageId });
    if (!page.properties) return 'Untitled';
    const titleProp = Object.values(page.properties).find((p: any) => p.type === 'title') as any;
    if (!titleProp?.title) return 'Untitled';
    return titleProp.title.map((item: any) => item.plain_text || '').join('');
}

export { notion };
