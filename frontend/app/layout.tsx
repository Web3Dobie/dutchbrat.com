// app/layout.tsx - Updated with your Google Analytics ID
import './globals.css'
import Navbar from './components/Navbar'
import Script from 'next/script'

export const metadata = {
  title: 'DutchBrat',
  description: 'Hedge fund brain meets Web3',
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