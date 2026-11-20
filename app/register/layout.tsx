import type { Metadata } from 'next'

// The page itself is a client component and cannot export metadata, so its
// title, description and canonical live in this pass-through layout.
export const metadata: Metadata = {
    title: "Register as a New Client | Hunter's Hounds",
    description: "Register yourself and your dog with Hunter's Hounds to book one-on-one dog walks around Highbury Fields and Clissold Park.",
    alternates: { canonical: 'https://hunters-hounds.london/register' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
