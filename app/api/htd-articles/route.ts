// app/api/htd-articles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface HTDArticle {
    id: string
    title: string
    summary: string
    publishedDate: string
    category: string
    filePath: string
    fileName: string
    size: number
    lastModified: string
    articleUrl: string
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const articleId = searchParams.get('id')

        // If requesting a single article by ID, fetch it from nginx
        if (articleId) {
            try {
                const response = await fetch(`http://nginx-articles/api/htd-articles/files/${articleId}.md`)

                if (!response.ok) {
                    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
                }

                const content = await response.text()

                return new Response(content, {
                    headers: {
                        'Content-Type': 'text/plain',
                        'Access-Control-Allow-Origin': '*'
                    }
                })

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                return NextResponse.json(
                    { error: 'Failed to fetch article', details: errorMessage },
                    { status: 500 }
                )
            }
        }

        // Otherwise, return the list of articles (your existing code)
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Path to HTD articles
        const articlesPath = '/app/htd-articles'

        if (!fs.existsSync(articlesPath)) {
            // Debug: Check what directories exist
            console.log('Articles path not found:', articlesPath)
            console.log('Available directories:')
            try {
                console.log('/app contents:', fs.readdirSync('/app'))
                console.log('/app/htd-articles contents:', fs.readdirSync('/app/HTD-Research-Agent'))
            } catch (e) {
                console.log('Debug error:', e)
            }

            return NextResponse.json({
                articles: [],
                total: 0,
                message: 'HTD articles directory not found',
                attempted_path: articlesPath
            })
        }

        // Scan directory for markdown files
        const files = fs.readdirSync(articlesPath)
            .filter(file => file.endsWith('.md'))
            .map(file => {
                const filePath = path.join(articlesPath, file)
                const stats = fs.statSync(filePath)

                return {
                    fileName: file,
                    filePath,
                    lastModified: stats.mtime,
                    size: stats.size
                }
            })
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

        // Parse each file for metadata
        const articles: HTDArticle[] = []

        for (const file of files.slice(offset, offset + limit)) {
            try {
                const content = fs.readFileSync(file.filePath, 'utf-8')
                const article = parseHTDArticle(file, content)
                if (article) {
                    articles.push(article)
                }
            } catch (parseError) {
                const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error'
                console.error(`Error parsing HTD article ${file.fileName}:`, errorMessage)
                // Continue with other files
            }
        }

        return NextResponse.json({
            articles,
            total: files.length,
            offset,
            limit,
            hasMore: offset + limit < files.length
        })

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Error fetching HTD articles:', errorMessage)
        return NextResponse.json(
            { error: 'Failed to fetch HTD articles', details: errorMessage },
            { status: 500 }
        )
    }
}

function parseHTDArticle(file: any, content: string): HTDArticle | null {
    try {
        // Extract metadata from markdown content
        const lines = content.split('\n')

        // Extract title (first H1)
        const titleMatch = content.match(/^# (.+)$/m)
        let title = titleMatch ? titleMatch[1].replace('HTD Research - ', '') : 'HTD Research Article'

        // Extract published date
        const dateMatch = content.match(/\*\*Published:\*\* (.+)$/m)
        let publishedDate = dateMatch ? dateMatch[1] : file.lastModified.toISOString().split('T')[0]

        // Extract category
        const categoryMatch = content.match(/\*\*Category:\*\* (.+)$/m)
        let category = categoryMatch ? categoryMatch[1] : 'Deep Dive Analysis'

        // Extract summary (first paragraph after metadata)
        let summary = ''
        const summaryMatch = content.match(/## Executive Summary\s*\n\s*([^\n]+)/m)
        if (summaryMatch) {
            summary = summaryMatch[1]
        } else {
            // Fallback: use first substantial paragraph
            const paragraphs = content.split('\n\n').filter(p =>
                p.length > 50 &&
                !p.startsWith('#') &&
                !p.startsWith('**') &&
                !p.startsWith('*HTD Research')
            )
            summary = paragraphs[0]?.substring(0, 200) + '...' || 'HTD Research institutional analysis'
        }

        // Generate article ID from filename
        const articleId = file.fileName.replace('.md', '')

        // Generate public URL for NGINX serving
        const articleUrl = `https://dutchbrat.com/articles/htd/${articleId}`

        return {
            id: articleId,
            title: title.trim(),
            summary: summary.trim(),
            publishedDate: formatDate(publishedDate),
            category: category.trim(),
            filePath: file.filePath,
            fileName: file.fileName,
            size: file.size,
            lastModified: file.lastModified.toISOString(),
            articleUrl
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
        console.error(`Error parsing article metadata for ${file.fileName}:`, errorMessage)
        return null
    }
}

function formatDate(dateStr: string): string {
    try {
        // Handle various date formats
        if (dateStr.includes(',')) {
            // "January 17, 2025" format
            return new Date(dateStr).toISOString().split('T')[0]
        } else if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
            // "2025-01-17" format
            return dateStr
        } else {
            // Fallback to current date
            return new Date().toISOString().split('T')[0]
        }
    } catch {
        return new Date().toISOString().split('T')[0]
    }
}