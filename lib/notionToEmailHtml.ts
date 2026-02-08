import { NotionBlock, RichTextItem, getPlainText } from './notionParser';

const BASE_URL = 'https://hunters-hounds.london';

// Notion color name → CSS color value
const NOTION_COLORS: Record<string, string> = {
    default: '#4b5563',
    gray: '#6b7280',
    brown: '#92400e',
    orange: '#ea580c',
    yellow: '#ca8a04',
    green: '#059669',
    blue: '#2563eb',
    purple: '#7c3aed',
    pink: '#db2777',
    red: '#dc2626',
    gray_background: '#f3f4f6',
    brown_background: '#fef3c7',
    orange_background: '#fff7ed',
    yellow_background: '#fefce8',
    green_background: '#ecfdf5',
    blue_background: '#eff6ff',
    purple_background: '#f5f3ff',
    pink_background: '#fdf2f8',
    red_background: '#fef2f2',
};

function richTextToHtml(richText: RichTextItem[]): string {
    if (!richText || richText.length === 0) return '';
    return richText.map(item => {
        let text = escapeHtml(item.text);
        if (!text) return '';

        // Apply annotations
        if (item.annotations.code) {
            text = `<code style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 14px; color: #dc2626;">${text}</code>`;
        }
        if (item.annotations.bold) text = `<strong>${text}</strong>`;
        if (item.annotations.italic) text = `<em>${text}</em>`;
        if (item.annotations.underline) text = `<u>${text}</u>`;
        if (item.annotations.strikethrough) text = `<s>${text}</s>`;

        // Apply color
        if (item.annotations.color && item.annotations.color !== 'default') {
            const color = NOTION_COLORS[item.annotations.color];
            if (color) {
                if (item.annotations.color.endsWith('_background')) {
                    text = `<span style="background-color: ${color}; padding: 2px 4px; border-radius: 3px;">${text}</span>`;
                } else {
                    text = `<span style="color: ${color};">${text}</span>`;
                }
            }
        }

        // Wrap in link
        if (item.href) {
            text = `<a href="${escapeHtml(item.href)}" style="color: #3b82f6; text-decoration: underline;">${text}</a>`;
        }

        return text;
    }).join('');
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>');
}

function getCalloutStyle(icon?: any): { bg: string; border: string; textColor: string } {
    // Map common emoji to colors for visual variety
    const emoji = icon?.emoji || '';
    if (['💡', '⚡', '🌟', '✨', '⭐'].includes(emoji)) {
        return { bg: '#fefce8', border: '#ca8a04', textColor: '#854d0e' };
    }
    if (['⚠️', '🔥', '❗', '❌'].includes(emoji)) {
        return { bg: '#fef2f2', border: '#dc2626', textColor: '#991b1b' };
    }
    if (['✅', '🌿', '🐕', '🌱', '💚'].includes(emoji)) {
        return { bg: '#ecfdf5', border: '#059669', textColor: '#065f46' };
    }
    if (['📝', '📌', '📎', '🔗'].includes(emoji)) {
        return { bg: '#f5f3ff', border: '#7c3aed', textColor: '#5b21b6' };
    }
    // Default: blue (matches brand)
    return { bg: '#eff6ff', border: '#3b82f6', textColor: '#1e40af' };
}

function blockToHtml(block: NotionBlock): string {
    switch (block.type) {
        case 'paragraph': {
            const text = richTextToHtml(block.content.richText);
            if (!text) return '<p style="margin: 0 0 16px 0; line-height: 1.7;">&nbsp;</p>';
            return `<p style="color: #4b5563; line-height: 1.7; font-size: 16px; margin: 0 0 16px 0;">${text}</p>`;
        }

        case 'heading_1': {
            const text = richTextToHtml(block.content.richText);
            return `<h1 style="color: #1f2937; font-size: 22px; font-weight: bold; margin: 32px 0 16px 0; padding-top: 16px; border-top: 2px solid #e5e7eb;">${text}</h1>`;
        }

        case 'heading_2': {
            const text = richTextToHtml(block.content.richText);
            return `<h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 24px 0 12px 0;">${text}</h2>`;
        }

        case 'heading_3': {
            const text = richTextToHtml(block.content.richText);
            return `<h3 style="color: #374151; font-size: 16px; font-weight: bold; margin: 20px 0 10px 0;">${text}</h3>`;
        }

        case 'bulleted_list_item': {
            const text = richTextToHtml(block.content.richText);
            const childrenHtml = block.children.length > 0
                ? `<ul style="margin: 4px 0 0 0; padding-left: 20px; list-style-type: circle;">${block.children.map(c => blockToHtml(c)).join('')}</ul>`
                : '';
            return `<li style="color: #4b5563; line-height: 1.7; font-size: 16px; margin-bottom: 6px;">${text}${childrenHtml}</li>`;
        }

        case 'numbered_list_item': {
            const text = richTextToHtml(block.content.richText);
            const childrenHtml = block.children.length > 0
                ? `<ol style="margin: 4px 0 0 0; padding-left: 20px;">${block.children.map(c => blockToHtml(c)).join('')}</ol>`
                : '';
            return `<li style="color: #4b5563; line-height: 1.7; font-size: 16px; margin-bottom: 6px;">${text}${childrenHtml}</li>`;
        }

        case 'to_do': {
            const text = richTextToHtml(block.content.richText);
            const checked = block.content.checked;
            const checkbox = checked ? '&#9745;' : '&#9744;';
            const textStyle = checked ? 'text-decoration: line-through; color: #9ca3af;' : 'color: #4b5563;';
            return `<p style="line-height: 1.7; font-size: 16px; margin: 0 0 6px 0;"><span style="font-size: 18px; margin-right: 6px;">${checkbox}</span><span style="${textStyle}">${text}</span></p>`;
        }

        case 'image': {
            const url = block.content.url || '';
            const caption = richTextToHtml(block.content.caption);
            const imgWidth = block.content.width ? Math.min(block.content.width, 600) : undefined;
            // If it's a local filename (no protocol), use the newsletter-images API
            const imgSrc = url.startsWith('http') ? url : `${BASE_URL}/api/newsletter-images/${url}`;
            const widthStyle = imgWidth ? `width: ${imgWidth}px; max-width: 100%;` : 'max-width: 100%;';
            return `
                <div style="text-align: center; margin: 24px 0;">
                    <img src="${imgSrc}" alt="${caption ? getPlainText(block.content.caption) : 'Newsletter image'}" style="${widthStyle} height: auto; border-radius: 8px; border: 2px solid #e5e7eb;">
                    ${caption ? `<p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0; font-style: italic;">${caption}</p>` : ''}
                </div>`;
        }

        case 'callout': {
            const text = richTextToHtml(block.content.richText);
            const icon = block.content.icon;
            const emoji = icon?.emoji || '';
            const style = getCalloutStyle(icon);
            const childrenHtml = block.children.length > 0
                ? block.children.map(c => blockToHtml(c)).join('')
                : '';
            return `
                <div style="margin: 20px 0; padding: 20px; background-color: ${style.bg}; border-left: 4px solid ${style.border}; border-radius: 0 8px 8px 0;">
                    <p style="color: ${style.textColor}; line-height: 1.7; font-size: 16px; margin: 0;">
                        ${emoji ? `<span style="font-size: 20px; margin-right: 8px;">${emoji}</span>` : ''}${text}
                    </p>
                    ${childrenHtml ? `<div style="margin-top: 8px; color: ${style.textColor};">${childrenHtml}</div>` : ''}
                </div>`;
        }

        case 'quote': {
            const text = richTextToHtml(block.content.richText);
            const childrenHtml = block.children.length > 0
                ? block.children.map(c => blockToHtml(c)).join('')
                : '';
            return `
                <blockquote style="margin: 20px 0; padding: 16px 20px; border-left: 4px solid #d1d5db; background-color: #f9fafb; border-radius: 0 8px 8px 0;">
                    <p style="color: #4b5563; line-height: 1.7; font-size: 16px; font-style: italic; margin: 0;">${text}</p>
                    ${childrenHtml}
                </blockquote>`;
        }

        case 'divider':
            return '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">';

        case 'code': {
            const text = getPlainText(block.content.richText);
            return `
                <pre style="margin: 16px 0; padding: 16px; background-color: #1f2937; border-radius: 8px; overflow-x: auto;">
                    <code style="color: #e5e7eb; font-family: 'Courier New', monospace; font-size: 14px; white-space: pre-wrap;">${escapeHtml(text)}</code>
                </pre>`;
        }

        case 'toggle': {
            // Emails don't support <details>; render as heading + content
            const text = richTextToHtml(block.content.richText);
            const childrenHtml = block.children.length > 0
                ? block.children.map(c => blockToHtml(c)).join('')
                : '';
            return `
                <div style="margin: 16px 0;">
                    <p style="color: #1f2937; font-weight: 600; font-size: 16px; margin: 0 0 8px 0;">${text}</p>
                    ${childrenHtml ? `<div style="padding-left: 16px; border-left: 2px solid #e5e7eb;">${childrenHtml}</div>` : ''}
                </div>`;
        }

        case 'table': {
            const hasColumnHeader = block.content.hasColumnHeader;
            const rows = block.children || [];
            if (rows.length === 0) return '';

            const rowsHtml = rows.map((row, idx) => {
                const cells = row.content?.cells || [];
                const isHeader = hasColumnHeader && idx === 0;
                const cellTag = isHeader ? 'th' : 'td';
                const cellStyle = isHeader
                    ? 'padding: 10px 12px; border: 1px solid #d1d5db; background-color: #f3f4f6; font-weight: 600; color: #1f2937; font-size: 14px; text-align: left;'
                    : 'padding: 10px 12px; border: 1px solid #d1d5db; color: #4b5563; font-size: 14px;';
                const cellsHtml = cells.map((cell: RichTextItem[]) =>
                    `<${cellTag} style="${cellStyle}">${richTextToHtml(cell)}</${cellTag}>`
                ).join('');
                return `<tr>${cellsHtml}</tr>`;
            }).join('');

            return `
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #d1d5db;">
                    ${rowsHtml}
                </table>`;
        }

        case 'bookmark': {
            const url = block.content.url || '';
            const caption = richTextToHtml(block.content.caption);
            return `
                <div style="margin: 16px 0; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px;">
                    <a href="${escapeHtml(url)}" style="color: #3b82f6; text-decoration: underline; font-size: 14px; word-break: break-all;">${caption || escapeHtml(url)}</a>
                </div>`;
        }

        case 'column_list': {
            // Render columns stacked vertically for email compatibility
            return block.children.map(col => {
                if (col.type === 'column' && col.children.length > 0) {
                    return col.children.map(c => blockToHtml(c)).join('');
                }
                return '';
            }).join('');
        }

        case 'column':
            return block.children.map(c => blockToHtml(c)).join('');

        default:
            return '';
    }
}

/**
 * Group consecutive list items into <ul> / <ol> wrappers
 */
function groupAndRenderBlocks(blocks: NotionBlock[]): string {
    const parts: string[] = [];
    let i = 0;

    while (i < blocks.length) {
        const block = blocks[i];

        if (block.type === 'bulleted_list_item') {
            const items: string[] = [];
            while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
                items.push(blockToHtml(blocks[i]));
                i++;
            }
            parts.push(`<ul style="margin: 0 0 16px 0; padding-left: 24px; color: #4b5563;">${items.join('')}</ul>`);
        } else if (block.type === 'numbered_list_item') {
            const items: string[] = [];
            while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
                items.push(blockToHtml(blocks[i]));
                i++;
            }
            parts.push(`<ol style="margin: 0 0 16px 0; padding-left: 24px; color: #4b5563;">${items.join('')}</ol>`);
        } else {
            parts.push(blockToHtml(block));
            i++;
        }
    }

    return parts.join('');
}

/**
 * Convert an array of parsed Notion blocks to email-compatible inline-styled HTML.
 * This produces just the body content — the email wrapper (header, footer, unsubscribe)
 * is added by generateNotionNewsletterEmail() in emailTemplates.ts.
 */
export function notionBlocksToEmailHtml(blocks: NotionBlock[]): string {
    return groupAndRenderBlocks(blocks);
}
