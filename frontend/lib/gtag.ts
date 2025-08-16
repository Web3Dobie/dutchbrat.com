// lib/gtag.ts - Google Analytics helper with your ID
export const GA_TRACKING_ID = 'G-XRESBQDDQ7'

declare global {
    interface Window {
        gtag: (command: string, targetId: string, config?: any) => void
    }
}

// Track page views
export const pageview = (url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', GA_TRACKING_ID, {
            page_location: url,
        })
    }
}

// Track events
export const event = (action: string, parameters: any) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', action, parameters)
    }
}

// Track specific clicks
export const trackClick = (element: string, url?: string) => {
    event('click', {
        event_category: 'engagement',
        event_label: element,
        value: url
    })
}

// Track crypto news clicks
export const trackCryptoNewsClick = (headline: string, source: string) => {
    event('crypto_news_click', {
        event_category: 'content',
        event_label: `${source}: ${headline}`,
        custom_parameters: {
            news_source: source,
            headline_preview: headline.substring(0, 50)
        }
    })
}

// Track article clicks  
export const trackArticleClick = (articleTitle: string) => {
    event('article_click', {
        event_category: 'content',
        event_label: articleTitle,
    })
}

// Track tweet clicks
export const trackTweetClick = (tweetPreview: string) => {
    event('tweet_click', {
        event_category: 'social',
        event_label: 'hunter_tweet',
        value: tweetPreview.substring(0, 50)
    })
}