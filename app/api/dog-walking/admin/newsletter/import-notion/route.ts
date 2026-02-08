import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { parseNotionBlocks, getNotionPageTitle } from "@/lib/notionParser";
import { downloadNotionImages } from "@/lib/notionImageDownloader";
import { notionBlocksToEmailHtml } from "@/lib/notionToEmailHtml";

// POST - Import a Notion page as newsletter content
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const body = await request.json();
        const { notion_page_id } = body;

        if (!notion_page_id) {
            return NextResponse.json(
                { error: "notion_page_id is required" },
                { status: 400 }
            );
        }

        // Clean the page ID (handle both full URLs and raw IDs)
        const pageId = extractPageId(notion_page_id);

        console.log(`Importing Notion page: ${pageId}`);

        // Fetch page title and blocks in parallel
        const [title, rawBlocks] = await Promise.all([
            getNotionPageTitle(pageId),
            parseNotionBlocks(pageId),
        ]);

        console.log(`Fetched ${rawBlocks.length} blocks from "${title}"`);

        // Download all Notion-hosted images locally
        const blocks = await downloadNotionImages(rawBlocks);

        // Count downloaded images
        let imageCount = 0;
        const countImages = (blocks: any[]) => {
            for (const block of blocks) {
                if (block.type === 'image') imageCount++;
                if (block.children?.length > 0) countImages(block.children);
            }
        };
        countImages(blocks);

        // Convert blocks to email HTML
        const notionHtml = notionBlocksToEmailHtml(blocks);

        console.log(`Imported "${title}": ${rawBlocks.length} blocks, ${imageCount} images`);

        return NextResponse.json({
            success: true,
            title,
            notion_page_id: pageId,
            blocks,
            notionHtml,
            image_count: imageCount,
        });
    } catch (error: any) {
        console.error("Failed to import Notion page:", error);
        return NextResponse.json(
            { error: error.message || "Failed to import Notion page" },
            { status: 500 }
        );
    }
}

/**
 * Extract a Notion page ID from a URL or raw ID string.
 * Handles formats like:
 * - "abc123def456..." (raw 32-char hex)
 * - "abc123de-f456-..." (UUID with dashes)
 * - "https://www.notion.so/Page-Title-abc123def456..."
 * - "https://www.notion.so/workspace/abc123def456..."
 */
function extractPageId(input: string): string {
    const trimmed = input.trim();

    // If it looks like a URL, extract the ID from it
    if (trimmed.includes('notion.so') || trimmed.includes('notion.site')) {
        // The page ID is the last 32 hex chars in the URL path
        const match = trimmed.match(/([a-f0-9]{32})/i);
        if (match) {
            const hex = match[1];
            // Format as UUID: 8-4-4-4-12
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
        // Try with dashes already present
        const uuidMatch = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (uuidMatch) return uuidMatch[1];
    }

    // If it's a 32-char hex string without dashes, format as UUID
    if (/^[a-f0-9]{32}$/i.test(trimmed)) {
        return `${trimmed.slice(0, 8)}-${trimmed.slice(8, 12)}-${trimmed.slice(12, 16)}-${trimmed.slice(16, 20)}-${trimmed.slice(20)}`;
    }

    // Otherwise assume it's already a valid page ID
    return trimmed;
}
