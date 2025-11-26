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
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /dog-walking/cancel

# Sitemap
Sitemap: https://hunters-hounds.london/sitemap.xml

# Crawl delay for server optimization
Crawl-delay: 1

# Priority pages for local SEO
# /services - Service descriptions
# /book-now - Booking interface
# /testimonials - Customer reviews
# /gallery - Service photos`,
            {
                headers: {
                    'Content-Type': 'text/plain',
                    'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
                },
            }
        )
    }

    if (host.includes('hunterthedobermann.')) {
        return new NextResponse(
            `User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
Disallow: /dog-walking/

# Memorial site sitemap
Sitemap: https://hunterthedobermann.london/sitemap.xml

# Respectful crawling for memorial content
Crawl-delay: 2`,
            {
                headers: {
                    'Content-Type': 'text/plain',
                    'Cache-Control': 'public, max-age=86400',
                },
            }
        )
    }

    // Default DutchBrat robots.txt
    return new NextResponse(
        `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /dog-walking/

# Sitemap
Sitemap: https://dutchbrat.com/sitemap.xml

# Standard crawl delay for trading platform
Crawl-delay: 1

# Crypto price aggregators
User-agent: CoinMarketCapBot
Allow: /
Crawl-delay: 0.5

User-agent: CoinGeckoBot
Allow: /
Crawl-delay: 0.5

User-agent: CryptoCompareBot
Allow: /
Crawl-delay: 0.5`,
        {
            headers: {
                'Content-Type': 'text/plain',
                'Cache-Control': 'public, max-age=86400',
            },
        }
    )
}