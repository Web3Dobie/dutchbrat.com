// app/layout.tsx - Enhanced with comprehensive SEO metadata for all domains
import './globals.css'
import Navbar from './components/Navbar'
import Script from 'next/script'
import { getDomainType } from '@/lib/domainDetection'

export async function generateMetadata() {
  const domainType = getDomainType()

  if (domainType === 'hunters-hounds') {
    return {
      title: 'Hunter\'s Hounds - Professional Dog Walking London | Highbury Fields & Clissold Park',
      description: 'Experienced one-on-one dog walking services in London. Serving Highbury Fields and Clissold Park with personalized care for your beloved pets. Book your free meet & greet today.',
      keywords: 'dog walking London, pet care Highbury Fields, Clissold Park dog walker, professional dog walking services London, one on one dog walking, Islington dog walker, North London pet care, insured dog walker',

      // Favicon configuration
      icons: {
        icon: [
          { url: '/favicon.ico', sizes: 'any' },
          { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
          { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' }
        ],
        apple: '/apple-touch-icon.png',
        other: [
          { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      manifest: '/site.webmanifest',

      openGraph: {
        title: 'Hunter\'s Hounds - Professional Dog Walking London',
        description: 'One-on-one dog walking in Highbury Fields & Clissold Park. Experienced, reliable, and caring pet care inspired by my beloved Dobermann Hunter.',
        type: 'website',
        locale: 'en_GB',
        siteName: 'Hunter\'s Hounds',
        images: [
          {
            url: '/images/dog-walking/hunter-and-me.jpg',
            width: 1200,
            height: 630,
            alt: 'Hunter\'s Hounds - Professional Dog Walking Services London'
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Hunter\'s Hounds - Professional Dog Walking London',
        description: 'One-on-one dog walking in Highbury Fields & Clissold Park',
        images: ['/images/dog-walking/hunter-and-me.jpg']
      },
      alternates: {
        canonical: 'https://hunters-hounds.london'
      },
      other: {
        'business:contact_data:locality': 'London',
        'business:contact_data:region': 'England',
        'business:contact_data:country_name': 'United Kingdom',
        'geo:region': 'GB-LND',
        'geo:placename': 'London',
        'geo:position': '51.5614;-0.1048'
      }
    }
  }

  if (domainType === 'hunter-memorial') {
    return {
      title: 'Hunter\'s Memory Garden - In Loving Memory of Our Beloved Dobermann',
      description: 'A beautiful memorial celebrating the life and precious memories of Hunter, our beloved Dobermann. Browse through 2,500+ photos and videos that capture his joyful spirit and the unconditional love he brought to our family.',
      keywords: 'Hunter memorial, Dobermann memories, pet memorial, dog memorial garden, beloved pet tribute, Hunter the Dobermann',

      // Memorial-specific favicon (could be same or different)
      icons: {
        icon: [
          { url: '/favicon.ico', sizes: 'any' },
          { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
          { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' }
        ],
        apple: '/apple-touch-icon.png',
        other: [
          { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      manifest: '/site.webmanifest',

      openGraph: {
        title: 'Hunter\'s Memory Garden - In Loving Memory',
        description: 'Celebrating the life and precious memories of Hunter, our beloved Dobermann. A collection of 2,500+ photos and videos preserving his joyful spirit.',
        type: 'website',
        locale: 'en_GB',
        siteName: 'Hunter\'s Memory Garden',
        images: [
          {
            url: '/images/hunter_memorial.jpg',
            width: 1200,
            height: 630,
            alt: 'Hunter\'s Memory Garden - Memorial for our beloved Dobermann'
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Hunter\'s Memory Garden - In Loving Memory',
        description: 'Celebrating the life and precious memories of Hunter, our beloved Dobermann',
        images: ['/images/hunter_memorial.jpg']
      },
      alternates: {
        canonical: 'https://hunterthedobermann.london'
      }
    }
  }

  // Enhanced DutchBrat metadata for crypto SEO
  return {
    title: 'DutchBrat - Crypto Trading Intelligence & AI Market Analysis | Real-Time Price Data',
    description: 'Professional crypto trading platform with AI-powered market briefings, real-time Bitcoin, Ethereum, and altcoin analysis. Get institutional-grade crypto insights and trading intelligence.',
    keywords: 'crypto trading, bitcoin price analysis, ethereum trading, crypto market briefings, AI crypto insights, real-time cryptocurrency data, DeFi analysis, trading intelligence, crypto research platform, blockchain analysis',

    // Favicon configuration
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
        { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' }
      ],
      apple: '/apple-touch-icon.png',
      other: [
        { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    manifest: '/site.webmanifest',

    openGraph: {
      title: 'DutchBrat - Crypto Trading Intelligence & AI Market Analysis',
      description: 'Professional crypto trading platform with AI-powered market briefings, real-time price data, and institutional-grade analysis for Bitcoin, Ethereum, and major altcoins.',
      type: 'website',
      locale: 'en_US',
      siteName: 'DutchBrat',
      images: [
        {
          url: '/images/crypto-trading-dashboard.jpg', // You'll need to add this image
          width: 1200,
          height: 630,
          alt: 'DutchBrat Crypto Trading Platform - Real-time Market Analysis'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: 'DutchBrat - Crypto Trading Intelligence',
      description: 'AI-powered crypto market insights with real-time Bitcoin, Ethereum, and altcoin analysis',
      images: ['/images/crypto-trading-dashboard.jpg'],
      creator: '@Web3_Dobie' // Your Twitter handle
    },
    alternates: {
      canonical: 'https://dutchbrat.com'
    },
    other: {
      'og:type': 'website',
      'article:publisher': 'https://dutchbrat.com',
      'twitter:domain': 'dutchbrat.com',
      'og:site_name': 'DutchBrat'
    }
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const domainType = getDomainType()

  return (
    <html lang="en">
      <head>
        {/* Enhanced Google Analytics with domain tracking */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XRESBQDDQ7"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XRESBQDDQ7', {
              page_location: window.location.href,
              page_title: document.title,
              custom_map: {'custom1': 'domain_type'}
            });
            
            // Track domain type for analytics
            gtag('event', 'page_view', {
              'custom1': '${domainType}',
              'domain': window.location.hostname
            });
          `}
        </Script>

        {/* Domain-specific Schema markup */}
        {domainType === 'hunters-hounds' && (
          <Script id="hunters-hounds-schema" type="application/ld+json">
            {`
              {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "name": "Hunter's Hounds",
                "description": "Professional dog walking service in North London",
                "url": "https://hunters-hounds.london",
                "telephone": "+44-XXX-XXX-XXXX",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "London",
                  "addressRegion": "England",
                  "addressCountry": "GB"
                },
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": "51.5614",
                  "longitude": "-0.1048"
                },
                "areaServed": [
                  "Highbury Fields",
                  "Clissold Park", 
                  "Islington",
                  "North London"
                ],
                "serviceType": "Pet Care Services",
                "priceRange": "££",
                "openingHours": "Mo-Su 07:00-19:00"
              }
            `}
          </Script>
        )}

        {domainType === 'dutchbrat' && (
          <Script id="dutchbrat-schema" type="application/ld+json">
            {`
              {
                "@context": "https://schema.org",
                "@type": "FinancialService",
                "name": "DutchBrat",
                "description": "Crypto trading intelligence and market analysis platform",
                "url": "https://dutchbrat.com",
                "serviceType": "Financial Analysis",
                "areaServed": "Worldwide",
                "offers": {
                  "@type": "Offer",
                  "description": "Real-time crypto market analysis and trading insights"
                }
              }
            `}
          </Script>
        )}

        {/* Google Search Console verification - add your verification codes */}
        {domainType === 'dutchbrat' && (
          <meta name="google-site-verification" content="qCHJJyupFmLRb_0WMcMSiSmFoVURfL9Dyk0i7sh87GI" />
        )}
        {domainType === 'hunters-hounds' && (
          <meta name="google-site-verification" content="aFYdHwNHfK8aKvnRFyMy_ds3BdFMDckCG5WjU5jw5qI" />
        )}
        {domainType === 'hunters-hounds' && (
          <meta name="google-site-verification" content="QZZlX0BDvhCpMcfMI9n5of9UMJP63fd6Na9SVPrNFNo" />
        )}
        {domainType === 'hunter-memorial' && (
          <meta name="google-site-verification" content="cSBUBXyY95mR5jA0ctaMVUPH0JpT8pJbm-o3byBEJAs" />
        )}
        {/* Bing Webmaster verification */}
        <meta name="msvalidate.01" content="your-bing-verification-code" />
      </head>
      <body className="bg-gray-950 text-white">
        <Navbar />
        <main className="px-6 py-10 min-h-screen">{children}</main>
      </body>
    </html>
  )
}