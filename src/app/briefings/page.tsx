// app/briefings/page.tsx
export const metadata = {
  title: 'Market Briefings | DutchBrat',
}

export default function BriefingsPage() {
  return (
    <main className="min-h-screen px-6 py-10 bg-gray-950 text-white">
      <h1 className="text-3xl font-bold mb-6">📈 Market Briefings</h1>
      <p className="text-gray-300">
        DutchbRat's daily macro briefings appear here. PDF downloads and summaries coming soon.
      </p>
    </main>
  )
}
