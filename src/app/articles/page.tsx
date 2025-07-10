// src/app/articles/page.tsx

// src/app/articles/page.tsx
export const metadata = {
  title: 'Articles | DutchBrat',
  description: 'Market commentary, technical analysis and more from Hunter the Dobie.',
}

export default function ArticlesPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Latest Articles</h1>
      <iframe
        src="https://blue-mud-0e41d5403.2.azurestaticapps.net"
        className="w-full h-[85vh] rounded-xl border border-gray-800"
      />
    </section>
  )
}

