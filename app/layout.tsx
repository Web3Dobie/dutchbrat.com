// app/layout.tsx - Updated with domain detection for three domains
import './globals.css'
import Navbar from './components/Navbar'
import Script from 'next/script'
import { getDomainType } from '@/lib/domainDetection'

export async function generateMetadata() {
  const domainType = getDomainType()

  if (domainType === 'hunters-hounds') {
    return {
      title: 'Hunter\'s Hounds - Professional Dog Walking London | Highbury Fields & Clissold Park',
      description: 'Experienced one-on-one dog walking services in London. Serving Highbury Fields and Clissold Park with personalized care for your beloved pets. Book your free meet & greet today.',
      keywords: 'dog walking London, pet care Highbury Fields, Clissold Park dog walker, professional dog walking services London, one on one dog walking, Islington dog walker',

      // Favicon configuration
      icons: {
        icon: [
          { url: '/favicon.ico', sizes: 'any' },
          { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
          { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' }
        ],
        apple: '/apple-touch-icon.png',
        other: [
          { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      manifest: '/site.webmanifest',

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

  if (domainType === 'hunter-memorial') {
    return {
      title: 'Hunter\'s Memory Garden - In Loving Memory of Our Beloved Dobermann',
      description: 'A beautiful memorial celebrating the life and precious memories of Hunter, our beloved Dobermann. Browse through 2,500+ photos and videos that capture his joyful spirit and the unconditional love he brought to our family.',
      keywords: 'Hunter memorial, Dobermann memories, pet memorial, dog memorial garden, beloved pet tribute, Hunter the Dobermann',

      // Memorial-specific favicon (could be same or different)
      icons: {
        icon: [
          { url: '/favicon.ico', sizes: 'any' },
          { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
          { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' }
        ],
        apple: '/apple-touch-icon.png',
        other: [
          { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      manifest: '/site.webmanifest',

      openGraph: {
        title: 'Hunter\'s Memory Garden - In Loving Memory',
        description: 'Celebrating the life and precious memories of Hunter, our beloved Dobermann. A collection of 2,500+ photos and videos preserving his joyful spirit.',
        type: 'website',
        locale: 'en_GB',
        siteName: 'Hunter\'s Memory Garden',
        images: [
          {
            url: '/images/hunter_memorial.jpg',
            width: 1200,
            height: 630,
            alt: 'Hunter\'s Memory Garden - Memorial for our beloved Dobermann'
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Hunter\'s Memory Garden - In Loving Memory',
        description: 'Celebrating the life and precious memories of Hunter, our beloved Dobermann',
        images: ['/images/hunter_memorial.jpg']
      },
      alternates: {
        canonical: 'https://hunterthedobermann.london'
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