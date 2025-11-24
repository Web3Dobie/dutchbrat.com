// components/SEOMetadata.tsx - Dynamic SEO component for articles and content
import Head from 'next/head'
import { getDomainType } from '@/lib/domainDetection'

interface SEOMetadataProps {
    title?: string
    description?: string
    keywords?: string
    type?: 'article' | 'briefing' | 'service' | 'page'
    publishedDate?: string
    modifiedDate?: string
    author?: string
    image?: string
    price?: string
    serviceType?: string
}

export default function SEOMetadata({
    title,
    description,
    keywords,
    type = 'page',
    publishedDate,
    modifiedDate,
    author = 'DutchBrat Team',
    image,
    price,
    serviceType
}: SEOMetadataProps) {
    const domainType = getDomainType()

    // Determine base URL and default values based on domain
    const getBaseUrl = () => {
        if (domainType === 'hunters-hounds') return 'https://hunters-hounds.london'
        if (domainType === 'hunter-memorial') return 'https://hunterthedobermann.london'
        return 'https://dutchbrat.com'
    }

    const baseUrl = getBaseUrl()
    const currentDate = new Date().toISOString()
    const defaultImage = domainType === 'hunters-hounds'
        ? '/images/dog-walking/hunter-and-me.jpg'
        : domainType === 'hunter-memorial'
            ? '/images/hunter_memorial.jpg'
            : '/images/crypto-trading-dashboard.jpg'

    // Generate structured data based on content type
    const generateStructuredData = () => {
        const baseStructure = {
            "@context": "https://schema.org",
            "url": typeof window !== 'undefined' ? window.location.href : baseUrl,
            "dateModified": modifiedDate || currentDate,
            "author": {
                "@type": "Person",
                "name": author
            }
        }

        switch (type) {
            case 'article':
                return {
                    ...baseStructure,
                    "@type": "Article",
                    "headline": title,
                    "description": description,
                    "datePublished": publishedDate || currentDate,
                    "image": image || defaultImage,
                    "publisher": {
                        "@type": "Organization",
                        "name": domainType === 'hunters-hounds' ? "Hunter's Hounds" : "DutchBrat",
                        "url": baseUrl
                    },
                    "mainEntityOfPage": typeof window !== 'undefined' ? window.location.href : baseUrl
                }

            case 'briefing':
                return {
                    ...baseStructure,
                    "@type": "AnalysisNewsArticle",
                    "headline": title,
                    "description": description,
                    "datePublished": publishedDate || currentDate,
                    "image": image || defaultImage,
                    "publisher": {
                        "@type": "Organization",
                        "name": "DutchBrat",
                        "url": "https://dutchbrat.com"
                    },
                    "about": {
                        "@type": "Thing",
                        "name": "Cryptocurrency Market Analysis"
                    }
                }

            case 'service':
                return {
                    ...baseStructure,
                    "@type": "Service",
                    "name": title,
                    "description": description,
                    "provider": {
                        "@type": "LocalBusiness",
                        "name": "Hunter's Hounds",
                        "url": baseUrl
                    },
                    "serviceType": serviceType || "Pet Care",
                    "offers": price ? {
                        "@type": "Offer",
                        "price": price,
                        "priceCurrency": "GBP"
                    } : undefined
                }

            default:
                return {
                    ...baseStructure,
                    "@type": "WebPage",
                    "name": title,
                    "description": description
                }
        }
    }

    const structuredData = generateStructuredData()

    return (
        <Head>
            {title && <title>{title}</title>}
            {description && <meta name="description" content={description} />}
            {keywords && <meta name="keywords" content={keywords} />}

            {/* Open Graph tags */}
            <meta property="og:title" content={title || ''} />
            <meta property="og:description" content={description || ''} />
            <meta property="og:image" content={image || defaultImage} />
            <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : baseUrl} />
            <meta property="og:type" content={type === 'article' || type === 'briefing' ? 'article' : 'website'} />

            {/* Twitter Card tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title || ''} />
            <meta name="twitter:description" content={description || ''} />
            <meta name="twitter:image" content={image || defaultImage} />
            {domainType === 'dutchbrat' && <meta name="twitter:creator" content="@Web3_Dobie" />}

            {/* Article-specific meta tags */}
            {type === 'article' || type === 'briefing' ? (
                <>
                    <meta property="article:author" content={author} />
                    {publishedDate && <meta property="article:published_time" content={publishedDate} />}
                    {modifiedDate && <meta property="article:modified_time" content={modifiedDate} />}
                    <meta property="article:section" content={type === 'briefing' ? 'Market Analysis' : 'Articles'} />
                    {keywords && <meta property="article:tag" content={keywords} />}
                </>
            ) : null}

            {/* Canonical URL */}
            <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : baseUrl} />

            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData, null, 2)
                }}
            />
        </Head>
    )
}

// Usage examples:

// For crypto articles:
// <SEOMetadata
//   title="Bitcoin Price Analysis December 2024 - Market Outlook"
//   description="Comprehensive Bitcoin price analysis with AI-powered insights, technical indicators, and market predictions for December 2024."
//   keywords="bitcoin price, crypto analysis, market prediction, December 2024"
//   type="article"
//   publishedDate="2024-12-01"
//   author="Hunter (Web3 Dobie)"
//   image="/images/bitcoin-analysis-dec-2024.jpg"
// />

// For market briefings:
// <SEOMetadata
//   title="Daily Crypto Market Briefing - December 1, 2024"
//   description="AI-powered crypto market briefing covering Bitcoin, Ethereum, and major altcoins with trading insights and market sentiment analysis."
//   keywords="crypto briefing, market analysis, Bitcoin, Ethereum, trading insights"
//   type="briefing"
//   publishedDate="2024-12-01T08:00:00Z"
//   author="DutchBrat AI"
// />

// For dog walking services:
// <SEOMetadata
//   title="Professional Dog Walking Highbury Fields - Hunter's Hounds"
//   description="Expert one-on-one dog walking services at Highbury Fields. Reliable, insured, and passionate about your pet's wellbeing."
//   keywords="dog walking Highbury Fields, pet care London, professional dog walker"
//   type="service"
//   serviceType="Pet Walking Service"
//   price="25.00"
// />