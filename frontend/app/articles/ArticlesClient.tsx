'use client';

import { useEffect, useState } from 'react';

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
    const [articles, setArticles] = useState<Article[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

    // Manually load marked.min.js if needed
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

    // Wait for marked, then fetch articles
    useEffect(() => {
        function tryFetch() {
            if (typeof window !== 'undefined' && window.marked) {
                fetch('/api/articles')
                    .then((res) => res.json())
                    .then((data: Article[]) => {
                        setArticles(data);
                        // Gather unique categories, force type to string[]
                        const unique = Array.from(
                            new Set(data.map(a => a.category).filter((cat): cat is string => !!cat))
                        );
                        setCategories(unique);
                    })
                    .catch((err) => console.error('Failed to load articles:', err));
            } else {
                setTimeout(tryFetch, 100);
            }
        }
        tryFetch();
    }, []);

    // Handle viewing full article
    function handleShowArticle(article: Article) {
        fetch(article.file)
            .then((res) => res.text())
            .then((md) => {
                const viewer = document.getElementById('article-viewer');
                const markdownTarget = document.getElementById('markdown-content');
                const container = document.getElementById('articles-list');
                if (viewer && markdownTarget && container) {
                    markdownTarget.innerHTML = window.marked.parse(md);
                    viewer.classList.remove('hidden');
                    container.style.display = 'none';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
    }

    function handleBack() {
        const viewer = document.getElementById('article-viewer');
        const markdownTarget = document.getElementById('markdown-content');
        const container = document.getElementById('articles-list');
        if (viewer && markdownTarget && container) {
            viewer.classList.add('hidden');
            container.style.display = 'block';
            markdownTarget.innerHTML = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Filter articles by selected category (or show all)
    const filteredArticles =
        selectedCategory === 'All'
            ? articles
            : articles.filter((a) => a.category === selectedCategory);

    // Group articles by year and month for display
    const grouped: Record<string, Record<string, Article[]>> = {};
    filteredArticles.forEach((article) => {
        const date = new Date(article.date);
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });
        grouped[year] ||= {};
        grouped[year][month] ||= [];
        grouped[year][month].push(article);
    });

    // Expand/collapse handlers
    const toggleYear = (year: string) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };
    const toggleMonth = (year: string, month: string) => {
        const key = `${year}-${month}`;
        setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <section className="max-w-5xl mx-auto px-4 py-8">
            {/* Centered header */}
            <div className="flex flex-col items-center mb-8">
                <img
                    src="/images/hunter_reading.png"
                    alt="Hunter"
                    className="object-cover rounded-full border-4 border-blue-700 shadow-xl mb-6"
                    style={{ width: '4rem', height: '4rem' }}
                />
                <h1 className="text-5xl font-extrabold text-center tracking-tight">
                    Hunter&apos;s Articles
                </h1>
            </div>

            {/* CATEGORY SELECT BOX */}
            <div className="mb-6 flex justify-center">
                <label htmlFor="category-select" className="mr-2 font-semibold">
                    Category:
                </label>
                <select
                    id="category-select"
                    className="px-3 py-2 rounded border-2 border-blue-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="All">All</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* ARTICLES LIST */}
            <div id="articles-list" className="space-y-8">
                {Object.keys(grouped)
                    .sort((a, b) => parseInt(b) - parseInt(a))
                    .map((year) => (
                        <div key={year}>
                            <button
                                className="flex items-center gap-2 text-2xl font-bold mb-2"
                                onClick={() => toggleYear(year)}
                                aria-expanded={expandedYears[year] ? 'true' : 'false'}
                            >
                                <span>{expandedYears[year] ? '▼' : '▶'}</span>
                                {year}
                            </button>
                            {expandedYears[year] &&
                                Object.keys(grouped[year]).map((month) => {
                                    const monthKey = `${year}-${month}`;
                                    return (
                                        <div key={month} className="ml-4">
                                            <button
                                                className="flex items-center gap-2 text-xl font-semibold mb-2 mt-4"
                                                onClick={() => toggleMonth(year, month)}
                                                aria-expanded={expandedMonths[monthKey] ? 'true' : 'false'}
                                            >
                                                <span>{expandedMonths[monthKey] ? '▼' : '▶'}</span>
                                                {month}
                                            </button>
                                            {expandedMonths[monthKey] &&
                                                grouped[year][month].map((article) => (
                                                    <div
                                                        key={article.id}
                                                        className="rounded-xl border border-gray-700 p-5 mb-4 bg-black/10 backdrop-blur-md hover:border-blue-500 transition cursor-pointer"
                                                        onClick={() => handleShowArticle(article)}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="text-lg font-semibold">{article.headline}</h4>
                                                            {article.category ? (
                                                                <span className="px-3 py-1 text-xs rounded-full bg-blue-700 text-white">
                                                                    {article.category}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="text-sm text-gray-400">
                                                            {new Date(article.date).toLocaleDateString()}
                                                        </p>
                                                        <p className="mt-2 text-gray-200">{article.summary}</p>
                                                        <p className="text-blue-400 underline mt-3 inline-block">Read full article</p>
                                                    </div>
                                                ))}
                                        </div>
                                    );
                                })}
                        </div>
                    ))}
            </div>

            {/* MARKDOWN VIEWER */}
            <div
                id="article-viewer"
                className="prose prose-invert max-w-none mt-10 hidden border border-gray-700 p-6 rounded-xl bg-black/20 backdrop-blur"
            >
                <button
                    id="back-button"
                    className="mb-6 px-4 py-2 rounded-full border border-gray-600 text-sm text-white hover:bg-gray-800"
                    onClick={handleBack}
                >
                    ← Back to all articles
                </button>
                <div id="markdown-content"></div>
            </div>
        </section>
    );
}
