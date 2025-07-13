'use client';

import { useEffect, useState } from 'react';

// Helper to get query param from URL (Next.js 13/14 compatible)
function getArticleIdFromQuery(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('articleId');
}

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
    const [openArticles, setOpenArticles] = useState<Record<string, string | null>>({});

    // Load marked.js if needed
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

    // Fetch articles after marked.js loads
    useEffect(() => {
        function tryFetch() {
            if (typeof window !== 'undefined' && window.marked) {
                fetch('/api/articles')
                    .then((res) => res.json())
                    .then((data: Article[]) => {
                        setArticles(data);
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

    // --- NEW: Auto-open article if ?articleId=... in query string
    useEffect(() => {
        const articleId = getArticleIdFromQuery();
        if (
            articleId &&
            articles.length > 0 &&
            !openArticles[articleId]
        ) {
            const article = articles.find(a => a.id === articleId);
            if (article) {
                handleToggleArticle(article);
            }
        }
        // eslint-disable-next-line
    }, [articles]); // Only run after articles are loaded

    // Filtering/grouping logic
    const filteredArticles =
        selectedCategory === 'All'
            ? articles
            : articles.filter((a) => a.category === selectedCategory);

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

    // Click/toggle article open (fetch on first open)
    const handleToggleArticle = (article: Article) => {
        if (openArticles[article.id] !== undefined) {
            // Close if open
            setOpenArticles(prev => {
                const newState = { ...prev };
                delete newState[article.id];
                return newState;
            });
            return;
        }
        // Fetch if URL is public
        if (
            article.file &&
            (article.file.startsWith('http') || article.file.startsWith('/'))
        ) {
            fetch(article.file)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch');
                    return res.text();
                })
                .then(md => {
                    setOpenArticles(prev => ({
                        ...prev,
                        [article.id]: window.marked.parse(md)
                    }));
                })
                .catch(() => {
                    setOpenArticles(prev => ({
                        ...prev,
                        [article.id]: '<div class="text-red-500">Could not load article.</div>'
                    }));
                });
            setOpenArticles(prev => ({
                ...prev,
                [article.id]: ''
            }));
        } else {
            setOpenArticles(prev => ({
                ...prev,
                [article.id]: '<div class="text-red-500">Article file path invalid or private.</div>'
            }));
        }
    };

    return (
        <section className="max-w-5xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-12">
                <img
                    src="/images/hunter_reading.png"
                    alt="Hunter"
                    className="object-cover rounded-full border-4 border-blue-700 shadow-xl mb-6"
                    style={{ width: '16rem', height: '16rem' }}
                />
                <h1 className="text-10x2 font-extrabold text-center tracking-tight">
                    Hunter&apos;s Articles
                </h1>
            </div>

            {/* Category Select */}
            <div className="mb-6">
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

            {/* Articles List */}
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
                                                grouped[year][month].map((article) => {
                                                    const isOpen = openArticles[article.id] !== undefined;
                                                    return (
                                                        <div
                                                            key={article.id}
                                                            className={
                                                                "rounded-xl border p-5 mb-4 bg-black/10 backdrop-blur-md hover:border-blue-500 transition cursor-pointer " +
                                                                (isOpen
                                                                    ? "border-blue-500"
                                                                    : "border-gray-700")
                                                            }
                                                            onClick={() => handleToggleArticle(article)}
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
                                                            {/* Markdown (if open) */}
                                                            {isOpen && (
                                                                <div
                                                                    className="prose prose-invert mt-6"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html:
                                                                            openArticles[article.id] === ""
                                                                                ? "<div>Loading...</div>"
                                                                                : openArticles[article.id] || ""
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    );
                                })}
                        </div>
                    ))}
            </div>
        </section>
    );
}
