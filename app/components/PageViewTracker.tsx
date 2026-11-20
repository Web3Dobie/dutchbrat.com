'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Tells the server which page a real browser is looking at, for the admin
 * Traffic page. Sends the path only — no cookie, no identifier. Rendered by
 * the root layout on Hunter's Hounds hosts only.
 *
 * The point of doing this from the browser rather than counting server
 * requests: crawlers and scanners fetch pages but do not run this.
 */
export default function PageViewTracker() {
    const pathname = usePathname()
    const first = useRef(true)

    useEffect(() => {
        if (!pathname || pathname.startsWith('/dog-walking/admin')) return
        // Automated browsers announce themselves here.
        if (typeof navigator === 'undefined' || navigator.webdriver) return

        const isFirst = first.current
        first.current = false

        let utm: string | null = null
        try {
            utm = new URLSearchParams(window.location.search).get('utm_source')
        } catch {
            // ignore
        }

        const body = JSON.stringify({
            path: pathname,
            // Only the landing page has a meaningful referrer; later views are
            // in-site navigation.
            ref: isFirst ? document.referrer : '',
            utm,
        })

        try {
            const url = '/api/dog-walking/pageview'
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
            } else {
                fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
            }
        } catch {
            // analytics must never break the page
        }
    }, [pathname])

    return null
}
