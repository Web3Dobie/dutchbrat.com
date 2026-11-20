import type { Metadata } from 'next'
import NewslettersClient from './NewslettersClient'
import { getPublicNewsletters, SITE_URL } from '@/lib/publicContent'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: "Pack Newsletter: Monthly News from a Highbury Dog Walker | Hunter's Hounds",
    description:
        "Every Hunter's Hounds newsletter in one place: new pack members, walk highlights and seasonal tips for dog owners around Highbury and Islington.",
    alternates: { canonical: `${SITE_URL}/newsletters` },
}

export default async function NewslettersPage() {
    const initial = await getPublicNewsletters()
        // The list only needs the title, month and date; the full text stays on each newsletter's own page.
        .then((all) => all.map((n) => ({ id: n.id, title: n.title, sent_at: n.sent_at, content: { month: n.content?.month } })))
        .catch((err) => {
            console.error('[newsletters] server render failed, falling back to client fetch:', err.message)
            return null
        })
    return <NewslettersClient initial={initial} />
}
