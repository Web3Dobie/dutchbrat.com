'use client';

import { useEffect } from 'react';

console.log("ArticlesClient file has been loaded by Next.js (should see this in browser console)");

declare global {
    interface Window {
        marked: {
            parse: (md: string) => string;
        };
    }
}

type Article = {
    id: string;
    headline: string;
    summary: string;
    file: string;
    date: string;
    link: string;
    tags: string[];
    status: string;
    category?: string;
};

export default function ArticlesClient() {
    // 1. Manually load marked.min.js if not present
    useEffect(() => {
        if (!window.marked) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            script.onload = () => {
                console.log('✅ marked.min.js loaded manually!');
            };
            document.body.appendChild(script);
        }
    }, []);

    // 2. Wait for marked, then fetch articles
    useEffect(() => {
        function tryFetch() {
            if (typeof window !== 'undefined' && window.marked) {
                fetch('/api/articles')
                    .then((res) => res.json())
                    .then(groupAndRenderArticles)
                    .catch((err) => console.error('Failed to load articles:', err));
            } else {
                setTimeout(tryFetch, 100);
            }
        }
        tryFetch();
    }, []);

    // 3. (Optional) Debugging: check for marked after 2s
    useEffect(() => {
        setTimeout(() => {
            console.log('window.marked is', typeof window !== 'undefined' ? window.marked : 'undefined');
        }, 2000);
    }, []);

    return (
        <section className="max-w-5xl mx-auto px-4 py-8">
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
        </section>
    );
}

// --- DOM-handling function ---

function groupAndRenderArticles(articles: Article[]): void {
    console.log('groupAndRenderArticles called:', articles);

    const container = document.getElementById('articles-list');
    const viewer = document.getElementById('article-viewer');
    const markdownTarget = document.getElementById('markdown-content');
    const backBtn = document.getElementById('back-button');

    if (!container || !viewer || !markdownTarget || !backBtn) {
        console.error('One or more required DOM elements not found');
        return;
    }

    container.innerHTML = ''; // clear old content

    const grouped: Record<string, Record<string, Article[]>> = {};

    articles.forEach((article) => {
        const date = new Date(article.date);
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });

        grouped[year] ||= {};
        grouped[year][month] ||= [];
        grouped[year][month].push(article);
    });

    for (const year of Object.keys(grouped).sort((a, b) => parseInt(b) - parseInt(a))) {
        const yearBlock = document.createElement('div');
        yearBlock.innerHTML = `<h2 class="text-2xl font-bold mb-2">${year}</h2>`;

        for (const month of Object.keys(grouped[year])) {
            const monthBlock = document.createElement('div');
            monthBlock.innerHTML = `<h3 class="text-xl font-semibold mb-2 mt-4">${month}</h3>`;

            grouped[year][month].forEach((article) => {
                const card = document.createElement('div');
                card.className =
                    'rounded-xl border border-gray-700 p-5 mb-4 bg-black/10 backdrop-blur-md hover:border-blue-500 transition cursor-pointer';

                const date = new Date(article.date).toLocaleDateString();

                card.innerHTML = `
                    <div class="flex justify-between items-center">
                        <h4 class="text-lg font-semibold">${article.headline}</h4>
                        ${article.category
                        ? `<span class="px-3 py-1 text-xs rounded-full bg-blue-700 text-white">${article.category}</span>`
                        : ''
                    }
                    </div>
                    <p class="text-sm text-gray-400">${date}</p>
                    <p class="mt-2 text-gray-200">${article.summary}</p>
                    <p class="text-blue-400 underline mt-3 inline-block">Read full article</p>
                `;

                card.onclick = () => {
                    fetch(article.file)
                        .then((res) => res.text())
                        .then((md) => {
                            markdownTarget.innerHTML = window.marked.parse(md);
                            viewer.classList.remove('hidden');
                            container.style.display = 'none';
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
        viewer.classList.add('hidden');
        container.style.display = 'block';
        markdownTarget.innerHTML = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}
