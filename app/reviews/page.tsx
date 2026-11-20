import type { Metadata } from 'next'
import ReviewsClient from './ReviewsClient'
import { getPublicReviews, SITE_URL } from '@/lib/publicContent'

// Read from the database on every request, so a new review shows at once.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: "Dog Walking Reviews from Highbury & Islington Owners | Hunter's Hounds",
    description:
        "Read what local dog owners say about Hunter's Hounds: one-on-one dog walks around Highbury Fields and Clissold Park, in their own words.",
    alternates: { canonical: `${SITE_URL}/reviews` },
}

export default async function ReviewsPage() {
    const initial = await getPublicReviews().catch((err) => {
        console.error('[reviews] server render failed, falling back to client fetch:', err.message)
        return null
    })
    return <ReviewsClient initial={initial} />
}
