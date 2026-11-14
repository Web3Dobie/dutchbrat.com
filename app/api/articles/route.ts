// frontend/app/api/articles/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Article metadata is derived from the markdown files on disk, NOT from Notion.
//
// This route used to query NOTION_SUBSTACK_ARCHIVE_DB_ID for the index while the
// article bodies were served from disk via /api/articles/files/. That database
// lives in a Notion workspace we have permanently lost access to (the account's
// login email no longer exists, so the verification code can't be received), and
// the integration token now gets 404 object_not_found for it. The index was the
// only part that ever lived in Notion — all 116 article bodies and 326 images are
// present under hunter-agent-posts/, so the archive is fully recoverable by
// parsing the files themselves.
//
// Response shape is unchanged: a flat array matching the Article interface in
// app/components/LatestArticleCard.tsx and ArticlesClient.tsx.

const ARTICLES_ROOT = '/app/hunter-posts'

// Directory on disk -> human-readable category (drives the Category filter in
// ArticlesClient, which treats it as free text, same as HTD's 'Deep Dive Analysis')
const SECTIONS: Record<string, string> = {
    explainer: 'Explainer',
    ta: 'Technical Analysis',
}

interface Article {
    id: string
    headline: string
    summary: string
    file: string
    date: string
    link: string
    tags: string[]
    status: string
    category: string
}

// Filenames are 'YYYY-MM-DD_slug.md'; the date prefix is the publication date.
function parseDateFromFilename(fileName: string): string {
    const match = fileName.match(/^(\d{4}-\d{2}-\d{2})_/)
    return match ? match[1] : ''
}

// First H1. Explainer posts carry two — '# Hunter Explains: X' followed by '# X' —
// so the branded prefix is stripped to get the cleaner headline.
function extractHeadline(content: string, fallback: string): string {
    const match = content.match(/^#\s+(.+)$/m)
    if (!match) return fallback
    return match[1].replace(/^Hunter\s+Explains:\s*/i, '').trim()
}

// First substantial prose paragraph, skipping images, headings, lists and quotes.
function extractSummary(content: string): string {
    const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim().replace(/\s+/g, ' '))
        .filter(p => p.length > 50 && !/^[#!*\->|]/.test(p))

    const first = paragraphs[0]
    if (!first) return ''
    return first.length > 300 ? first.slice(0, 300).trimEnd() + '…' : first
}

export async function GET(_req: NextRequest) {
    try {
        if (!fs.existsSync(ARTICLES_ROOT)) {
            console.error(`Articles directory not found: ${ARTICLES_ROOT}`)
            return NextResponse.json([])
        }

        const articles: Article[] = []

        for (const [dir, category] of Object.entries(SECTIONS)) {
            const sectionPath = path.join(ARTICLES_ROOT, dir)
            if (!fs.existsSync(sectionPath)) continue

            for (const fileName of fs.readdirSync(sectionPath)) {
                if (!fileName.endsWith('.md')) continue

                try {
                    const content = fs.readFileSync(path.join(sectionPath, fileName), 'utf-8')
                    const slug = fileName.replace(/\.md$/, '')

                    articles.push({
                        id: slug,
                        headline: extractHeadline(content, slug),
                        summary: extractSummary(content),
                        // Served by app/api/articles/files/[...path], which proxies to nginx-articles
                        file: `/api/articles/files/${dir}/${fileName}`,
                        date: parseDateFromFilename(fileName),
                        // The per-article tweet URL was a Notion property and is gone with it.
                        link: '',
                        tags: [],
                        // Anything published to disk is published; Notion's Status had no
                        // other value by the time the archive was mirrored here.
                        status: 'published',
                        category,
                    })
                } catch (fileErr) {
                    // One unreadable file shouldn't take down the whole archive.
                    console.error(`Error parsing article ${dir}/${fileName}:`, fileErr)
                }
            }
        }

        articles.sort((a, b) => b.date.localeCompare(a.date))

        console.log(`Returning ${articles.length} articles from disk`)
        return NextResponse.json(articles)
    } catch (err) {
        // Deliberately does not echo err.message to the client: the previous version
        // returned it verbatim, publishing the Notion database UUID and integration
        // name on every request.
        console.error('Error fetching articles:', err)
        return NextResponse.json({ error: 'Failed to load articles' }, { status: 500 })
    }
}
