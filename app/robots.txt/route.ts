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

# Block crypto/trading content from hunters-hounds domain
Disallow: /briefings/
Disallow: /briefings
Disallow: /articles/
Disallow: /articles
Disallow: /hunter-x/
Disallow: /hunter-x
Disallow: /hunter/
Disallow: /hunter

# Sitemap
Sitemap: https://hunters-hounds.london/sitemap.xml

# Crawl delay for server optimization
Crawl-delay: 1

# Priority pages for local SEO
# /services - Service descriptions
# /book-now - Booking interface
# /my-account - Customer dashboard
# /testimonials - Customer reviews (planned)
# /gallery - Service photos (planned)`,
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

# Block all business content from memorial site
Disallow: /dog-walking/
Disallow: /dog-walking
Disallow: /briefings/
Disallow: /briefings
Disallow: /articles/
Disallow: /articles
Disallow: /hunter-x/
Disallow: /hunter-x
Disallow: /services/
Disallow: /services
Disallow: /book-now/
Disallow: /book-now
Disallow: /my-account/
Disallow: /my-account

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

# Aggressively block dog-walking content from crypto platform
Disallow: /dog-walking/
Disallow: /dog-walking
Disallow: /*dog-walking*
Disallow: /services/
Disallow: /services
Disallow: /book-now/
Disallow: /book-now
Disallow: /my-account/
Disallow: /my-account

# Block memorial content - should be on hunterthedobermann.london
Disallow: /hunter/
Disallow: /hunter

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
