import './globals.css' // ✅ correct

export const metadata = {
  title: 'DutchBrat',
  description: 'Hedge fund brain meets Web3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">{children}</body>
    </html>
  )
}
