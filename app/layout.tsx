// app/layout.tsx - Updated with domain detection
import './globals.css'
import Navbar from './components/Navbar'
import Script from 'next/script'
import { isHuntersHoundsDomain } from '@/lib/domainDetection'

export async function generateMetadata() {
  const isHuntersHounds = isHuntersHoundsDomain()
  
  if (isHuntersHounds) {
    return {
      title: 'Hunter\'s Hounds - Professional Dog Walking London | Highbury Fields & Clissold Park',
      description: 'Experienced one-on-one dog walking services in London. Serving Highbury Fields and Clissold Park with personalized care for your beloved pets. Book your free meet & greet today.',
      keywords: 'dog walking London, pet care Highbury Fields, Clissold Park dog walker, professional dog walking services London, one on one dog walking, Islington dog walker',
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
        'business:contact_data:country_name': 'United Kingdom'
      }
    }
  }
  
  // Default DutchBrat metadata (unchanged)
  return {
    title: 'DutchBrat',
    description: 'Hedge fund brain meets Web3',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
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
            });
          `}
        </Script>
      </head>
      <body className="bg-gray-950 text-white">
        <Navbar />
        <main className="px-6 py-10 min-h-screen">{children}</main>
      </body>
    </html>
  )
}