import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getPublicNewsletters } from '@/lib/publicContent'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const headersList = headers()
    const host = headersList.get('host') || ''

    // Determine base URL based on domain
    let baseUrl = 'https://dutchbrat.com'
    if (host.includes('hunters-hounds.')) {
        baseUrl = 'https://hunters-hounds.london'
    } else if (host.includes('hunterthedobermann.')) {
        baseUrl = 'https://hunterthedobermann.london'
    }

    const currentDate = new Date().toISOString().split('T')[0]

    // Domain-specific sitemap content
    if (host.includes('hunters-hounds.')) {
        // Only pages that exist and are worth finding. /testimonials and
        // /gallery were listed here but never existed; /my-account is a login.
        const pages: Array<{ path: string; changefreq: string; priority: string; lastmod?: string }> = [
            { path: '', changefreq: 'weekly', priority: '1.0' },
            { path: '/services', changefreq: 'monthly', priority: '0.9' },
            { path: '/book-now', changefreq: 'weekly', priority: '0.8' },
            { path: '/reviews', changefreq: 'weekly', priority: '0.8' },
            { path: '/guides/festive-dog-friendly-london', changefreq: 'monthly', priority: '0.8' },
            { path: '/newsletters', changefreq: 'monthly', priority: '0.7' },
            { path: '/register', changefreq: 'yearly', priority: '0.5' },
        ]

        // One entry per sent newsletter, dated when it went out. If the
        // database is unavailable the fixed pages are still served.
        try {
            for (const n of await getPublicNewsletters()) {
                pages.push({
                    path: `/newsletters/${n.id}`,
                    changefreq: 'yearly',
                    priority: '0.6',
                    lastmod: String(n.sent_at).split('T')[0],
                })
            }
        } catch (err) {
            console.error('[sitemap] newsletters not listed:', (err as Error).message)
        }

        // lastmod only where it is true: stamping today's date on every page
        // on every request teaches crawlers to ignore the field.
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
    .map(
        (p) => `  <url>
    <loc>${baseUrl}${p.path}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join('\n')}
</urlset>`

        return new NextResponse(sitemap, {
            headers: {
                'Content-Type': 'application/xml',
            },
        })
    }

    if (host.includes('hunterthedobermann.')) {
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/gallery</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`

        return new NextResponse(sitemap, {
            headers: {
                'Content-Type': 'application/xml',
            },
        })
    }

    // Default DutchBrat sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/briefings</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/articles</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/hunter</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/hunter-x</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`

    return new NextResponse(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
        },
    })
}