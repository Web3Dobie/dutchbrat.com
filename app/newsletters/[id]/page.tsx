import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import NewsletterDetailClient from './NewsletterDetailClient'
import { getPublicNewsletter, SITE_URL, type PublicNewsletter } from '@/lib/publicContent'

export const dynamic = 'force-dynamic'

/**
 * `failed` (the database could not be read) is kept apart from "no such
 * newsletter": the first falls back to fetching in the browser, the second is
 * a real 404 rather than a 200 page that says "not found".
 */
async function load(id: string): Promise<{ newsletter: PublicNewsletter | null; failed: boolean }> {
    try {
        return { newsletter: await getPublicNewsletter(Number(id)), failed: false }
    } catch (err) {
        console.error('[newsletter] server render failed, falling back to client fetch:', (err as Error).message)
        return { newsletter: null, failed: true }
    }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const { newsletter } = await load(params.id)
    if (!newsletter) return { title: "Pack Newsletter | Hunter's Hounds" }
    const month = newsletter.content?.month
    return {
        title: `${newsletter.title} | Pack Newsletter`,
        description: `The ${month ? `${month} ` : ''}Hunter's Hounds newsletter: news from the pack, walk highlights and seasonal tips for dog owners around Highbury and Islington.`,
        alternates: { canonical: `${SITE_URL}/newsletters/${newsletter.id}` },
    }
}

export default async function NewsletterDetailPage({ params }: { params: { id: string } }) {
    const { newsletter, failed } = await load(params.id)
    if (!newsletter && !failed) notFound()
    return <NewsletterDetailClient initial={newsletter} />
}
