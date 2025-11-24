import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
    const headersList = headers()
    const host = headersList.get('host') || ''

    // Domain-specific robots.txt content
    if (host.includes('hunters-hounds.')) {
        return new NextResponse(
            `User-agent: *
Allow: /

# Sitemap
Sitemap: https://hunters-hounds.london/sitemap.xml

# Local business optimization
Allow: /services
Allow: /book-now
Allow: /my-account
Allow: /testimonials
Allow: /gallery

# Block admin and API paths
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /dog-walking/cancel

# Crawl delay for better server performance
Crawl-delay: 1`,
            {
                headers: {
                    'Content-Type': 'text/plain',
                },
            }
        )
    }

    if (host.includes('hunterthedobermann.')) {
        return new NextResponse(
            `User-agent: *
Allow: /

# Memorial site - limited crawling
Sitemap: https://hunterthedobermann.london/sitemap.xml

# Allow main memorial content
Allow: /hunter
Allow: /gallery

# Block unnecessary paths for memorial site
Disallow: /api/
Disallow: /_next/
Disallow: /admin/

# Reduced crawl frequency for memorial site
Crawl-delay: 2`,
            {
                headers: {
                    'Content-Type': 'text/plain',
                },
            }
        )
    }

    // Default DutchBrat robots.txt
    return new NextResponse(
        `User-agent: *
Allow: /

# Sitemap
Sitemap: https://dutchbrat.com/sitemap.xml

# Optimize for crypto trading content
Allow: /briefings
Allow: /articles
Allow: /hunter
Allow: /hunter-x

# Block sensitive areas
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /dog-walking/

# Allow aggressive crawling for trading platform
Crawl-delay: 0.5

# Special rules for crypto price bots
User-agent: CoinMarketCapBot
Allow: /
User-agent: CoinGeckoBot  
Allow: /`,
        {
            headers: {
                'Content-Type': 'text/plain',
            },
        }
    )
}