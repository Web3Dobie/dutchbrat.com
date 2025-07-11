'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export const metadata = {
  title: 'Articles | DutchBrat',
  description: 'Market commentary, technical analysis and more from Hunter the Dobie.',
}

export default function ArticlesPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.marked) {
      fetch('/api/articles')
        .then((res) => res.json())
        .then(groupAndRenderArticles)
        .catch((err) => console.error('Failed to load articles:', err))
    }
  }, [])

  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <Script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" strategy="beforeInteractive" />
      <h1 className="text-3xl font-bold mb-4 flex items-center gap-4">
        <img
          src="/images/hunter_reading.png"
          alt="Hunter"
          className="w-12 h-12 rounded-full border border-gray-500 shadow"
        />
        Hunter's Articles
      </h1>

      <div id="articles-list" className="space-y-8"></div>

      <div
        id="article-viewer"
        className="prose prose-invert max-w-none mt-10 hidden border border-gray-700 p-6 rounded-xl bg-black/20 backdrop-blur"
      >
        <button
          id="back-button"
          className="mb-6 px-4 py-2 rounded-full border border-gray-600 text-sm text-white hover:bg-gray-800"
        >
          ← Back to all articles
        </button>
        <div id="markdown-content"></div>
      </div>

      <Script id="article-logic" strategy="afterInteractive">
        {`
          function formatDate(dateStr) {
            const date = new Date(dateStr);
            return {
              year: date.getFullYear(),
              month: date.toLocaleString('default', { month: 'long' }),
              day: date.toLocaleDateString()
            };
          }

          function groupAndRenderArticles(articles) {
            const grouped = {};

            articles.forEach(article => {
              const { year, month } = formatDate(article.date);
              if (!grouped[year]) grouped[year] = {};
              if (!grouped[year][month]) grouped[year][month] = [];
              grouped[year][month].push(article);
            });

            const container = document.getElementById("articles-list");
            const viewer = document.getElementById("article-viewer");
            const markdownTarget = document.getElementById("markdown-content");
            const backBtn = document.getElementById("back-button");

            for (const year of Object.keys(grouped).sort((a, b) => b - a)) {
              const yearBlock = document.createElement("div");
              yearBlock.innerHTML = \`<h2 class="text-2xl font-bold mb-2">\${year}</h2>\`;

              for (const month of Object.keys(grouped[year])) {
                const monthBlock = document.createElement("div");
                monthBlock.innerHTML = \`<h3 class="text-xl font-semibold mb-2 mt-4">\${month}</h3>\`;

                grouped[year][month].forEach(article => {
                  const card = document.createElement("div");
                  card.className = "rounded-xl border border-gray-700 p-5 mb-4 bg-black/10 backdrop-blur-md hover:border-blue-500 transition cursor-pointer";

                  const date = new Date(article.date).toLocaleDateString();

                  card.innerHTML = \`
                    <div class="flex justify-between items-center">
                      <h4 class="text-lg font-semibold">\${article.title}</h4>
                      \${article.category ? \`<span class="px-3 py-1 text-xs rounded-full bg-blue-700 text-white">\${article.category}</span>\` : ""}
                    </div>
                    <p class="text-sm text-gray-400">\${date}</p>
                    <p class="mt-2 text-gray-200">\${article.summary}</p>
                    <p class="text-blue-400 underline mt-3 inline-block">Read full article</p>
                  \`;

                  card.onclick = () => {
                    fetch(article.file)
                      .then(res => res.text())
                      .then(md => {
                        markdownTarget.innerHTML = window.marked.parse(md);
                        viewer.classList.remove("hidden");
                        container.style.display = "none";
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      });
                  };

                  monthBlock.appendChild(card);
                });

                yearBlock.appendChild(monthBlock);
              }

              container.appendChild(yearBlock);
            }

            backBtn.onclick = () => {
              viewer.classList.add("hidden");
              container.style.display = "block";
              markdownTarget.innerHTML = "";
              window.scrollTo({ top: 0, behavior: 'smooth' });
            };
          }
        `}
      </Script>
    </section>
  )
}
