import type { Metadata } from 'next'

// The page itself is a client component and cannot export metadata, so its
// title, description and canonical live in this pass-through layout.
export const metadata: Metadata = {
    title: "Book a Dog Walk or Free Meet & Greet in Highbury | Hunter's Hounds",
    description: "Check live availability and book a one-on-one dog walk or a free meet & greet with Hunter's Hounds, around Highbury Fields and Clissold Park.",
    alternates: { canonical: 'https://hunters-hounds.london/book-now' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
