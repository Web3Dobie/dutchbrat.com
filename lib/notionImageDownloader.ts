import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { NotionBlock } from './notionParser';

const NEWSLETTER_IMAGES_DIR = '/app/newsletter-images';
const MAX_WIDTH = 600;
const JPEG_QUALITY = 85;

function isNotionUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('secure.notion-static.com') ||
        url.includes('prod-files-secure.s3') ||
        url.includes('s3.us-west-2.amazonaws.com');
}

function generateFilename(url: string, ext: string): string {
    // Hash only the URL path (without query params) so the same Notion image
    // produces the same filename across re-imports (Notion CDN URLs change
    // their query params/tokens on every API call)
    let stableUrl = url;
    try {
        const parsed = new URL(url);
        stableUrl = parsed.origin + parsed.pathname;
    } catch { /* use full URL if parsing fails */ }
    const hash = createHash('md5').update(stableUrl).digest('hex').slice(0, 12);
    return `notion_${hash}.${ext}`;
}

interface DownloadResult {
    filename: string;
    width: number;
}

async function downloadAndProcessImage(url: string): Promise<DownloadResult | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to download image: ${response.status} ${url}`);
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Determine output format from content type
        const contentType = response.headers.get('content-type') || '';
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('gif')) ext = 'gif';
        else if (contentType.includes('webp')) ext = 'webp';

        const filename = generateFilename(url, ext);
        const outputPath = path.join(NEWSLETTER_IMAGES_DIR, filename);

        // Skip if already downloaded (hash-based filename means same image = same file)
        if (existsSync(outputPath)) {
            // Still read dimensions from the existing file
            const meta = await sharp(outputPath).metadata();
            console.log(`Image already exists: ${filename} (${meta.width}px wide)`);
            return { filename, width: meta.width || MAX_WIDTH };
        }

        // Ensure directory exists
        if (!existsSync(NEWSLETTER_IMAGES_DIR)) {
            await mkdir(NEWSLETTER_IMAGES_DIR, { recursive: true });
        }

        // Process with Sharp: resize to max width for email, optimize
        let processed: Buffer;
        let finalWidth: number;
        if (ext === 'gif') {
            // Don't process GIFs (may be animated)
            processed = buffer;
            const meta = await sharp(buffer).metadata();
            finalWidth = meta.width ? Math.min(meta.width, MAX_WIDTH) : MAX_WIDTH;
        } else {
            const image = sharp(buffer);
            const metadata = await image.metadata();

            if (metadata.width && metadata.width > MAX_WIDTH) {
                image.resize(MAX_WIDTH, undefined, { withoutEnlargement: true });
            }

            if (ext === 'jpg' || ext === 'jpeg') {
                processed = await image.jpeg({ quality: JPEG_QUALITY }).toBuffer();
            } else if (ext === 'png') {
                processed = await image.png({ compressionLevel: 8 }).toBuffer();
            } else if (ext === 'webp') {
                processed = await image.webp({ quality: JPEG_QUALITY }).toBuffer();
            } else {
                processed = await image.toBuffer();
            }

            // Read final dimensions after processing
            const finalMeta = await sharp(processed).metadata();
            finalWidth = finalMeta.width || metadata.width || MAX_WIDTH;
        }

        await writeFile(outputPath, processed);
        console.log(`Downloaded and saved: ${filename} (${(processed.length / 1024).toFixed(1)}KB, ${finalWidth}px wide)`);
        return { filename, width: finalWidth };
    } catch (error) {
        console.error(`Error downloading image from ${url}:`, error);
        return null;
    }
}

/**
 * Walk all blocks recursively. For any image block with a Notion CDN URL,
 * download the image, store locally, and replace the URL with the local filename.
 * Returns the modified blocks array (new copy, original not mutated).
 */
export async function downloadNotionImages(blocks: NotionBlock[]): Promise<NotionBlock[]> {
    const results: NotionBlock[] = [];

    // Collect all image download promises for parallel execution (max 3 concurrent)
    const imageBlocks: { block: NotionBlock; index: number }[] = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'image' && block.content.url && isNotionUrl(block.content.url)) {
            imageBlocks.push({ block, index: i });
        }
    }

    // Download images in batches of 3
    const downloadResults = new Map<number, DownloadResult | null>();
    for (let i = 0; i < imageBlocks.length; i += 3) {
        const batch = imageBlocks.slice(i, i + 3);
        const batchResults = await Promise.all(
            batch.map(({ block }) => downloadAndProcessImage(block.content.url))
        );
        batch.forEach(({ index }, batchIdx) => {
            downloadResults.set(index, batchResults[batchIdx]);
        });
    }

    // Build result array with updated URLs and recursively process children
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const updatedChildren = block.children.length > 0
            ? await downloadNotionImages(block.children)
            : block.children;

        if (downloadResults.has(i)) {
            const result = downloadResults.get(i);
            if (result) {
                results.push({
                    ...block,
                    content: { ...block.content, url: result.filename, width: result.width },
                    children: updatedChildren,
                });
            } else {
                // Download failed, keep original URL
                results.push({ ...block, children: updatedChildren });
            }
        } else {
            results.push({ ...block, children: updatedChildren });
        }
    }

    return results;
}
