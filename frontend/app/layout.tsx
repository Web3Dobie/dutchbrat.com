// src/app/layout.tsx
import './globals.css'
import Navbar from './components/Navbar'

export const metadata = {
  title: 'DutchBrat',
  description: 'Hedge fund brain meets Web3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        <Navbar />
        <main className="px-6 py-10 min-h-screen">{children}</main>
      </body>
    </html>
  )
}

