import type { Metadata } from 'next'

// The page itself is a client component and cannot export metadata, so its
// title, description and canonical live in this pass-through layout.
export const metadata: Metadata = {
    title: "My Account | Hunter's Hounds",
    description: "Log in to manage your Hunter's Hounds bookings, dogs and photos.",
    // A login page: nothing here for a search engine to list.
    robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
