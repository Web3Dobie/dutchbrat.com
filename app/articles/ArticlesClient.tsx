'use client';

import { useEffect, useState } from 'react';

// Helper to get query params from URL
function getQueryParams(): { articleId: string | null; htdArticleId: string | null } {
    if (typeof window === 'undefined') return { articleId: null, htdArticleId: null };
    const params = new URLSearchParams(window.location.search);
    return {
        articleId: params.get('articleId'),
        htdArticleId: params.get('htd-article-id')
    };
}

declare global {
    interface Window {
        marked: {
            parse: (md: string) => string;
        };
    }
}

type HunterArticle = {
    id: string;
    headline: string;
    summary: string;
    file: string;
    date: string;
    link: string;
    tags: string[];
    status: string;
    category?: string;
    type: 'hunter';
};

type HTDArticle = {
    id: string;
    title: string;
    summary: string;
    publishedDate: string;
    category: string;
    filePath: string;
    fileName: string;
    size: number;
    lastModified: string;
    articleUrl: string;
    type: 'htd';
};

type Article = HunterArticle | HTDArticle;

export default function ArticlesClient() {
    const [hunterArticles, setHunterArticles] = useState<HunterArticle[]>([]);
    const [htdArticles, setHTDArticles] = useState<HTDArticle[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedType, setSelectedType] = useState<'all' | 'hunter' | 'htd'>('all');
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

    // Fetch both Hunter and HTD articles
    useEffect(() => {
        function tryFetch() {
            if (typeof window !== 'undefined' && window.marked) {
                // Fetch Hunter articles
                fetch('/api/articles')
                    .then((res) => res.json())
                    .then((data: Omit<HunterArticle, 'type'>[]) => {
                        const hunterWithType = data.map(article => ({ ...article, type: 'hunter' as const }));
                        setHunterArticles(hunterWithType);
                    })
                    .catch((err) => console.error('Failed to load Hunter articles:', err));

                // Fetch HTD articles
                fetch('/api/htd-articles')
                    .then((res) => res.json())
                    .then((data: { articles: Omit<HTDArticle, 'type'>[] }) => {
                        const htdWithType = data.articles.map(article => ({ ...article, type: 'htd' as const }));
                        setHTDArticles(htdWithType);
                    })
                    .catch((err) => console.error('Failed to load HTD articles:', err));
            } else {
                setTimeout(tryFetch, 100);
            }
        }
        tryFetch();
    }, []);

    // Update categories when articles change
    useEffect(() => {
        const allArticles = [...hunterArticles, ...htdArticles];
        const unique = Array.from(
            new Set(allArticles.map(a =>
                a.type === 'hunter' ? a.category : a.category
            ).filter((cat): cat is string => !!cat))
        );
        setCategories(unique);
    }, [hunterArticles, htdArticles]);

    // Auto-open article if query params present
    useEffect(() => {
        const { articleId, htdArticleId } = getQueryParams();
        const allArticles = [...hunterArticles, ...htdArticles];

        if (articleId && allArticles.length > 0 && !openArticles[articleId]) {
            const article = hunterArticles.find(a => a.id === articleId);
            if (article) {
                autoExpandAndOpen(article, article.date);
            }
        }

        if (htdArticleId && allArticles.length > 0 && !openArticles[htdArticleId]) {
            const article = htdArticles.find(a => a.id === htdArticleId);
            if (article) {
                autoExpandAndOpen(article, article.publishedDate);
            }
        }
        // eslint-disable-next-line
    }, [hunterArticles, htdArticles]);

    const autoExpandAndOpen = (article: Article, dateStr: string) => {
        const date = new Date(dateStr);
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });
        const monthKey = `${year}-${month}`;

        setExpandedYears(prev => ({ ...prev, [year]: true }));
        setExpandedMonths(prev => ({ ...prev, [monthKey]: true }));
        handleToggleArticle(article);
    };

    // Get combined and filtered articles
    const getCombinedArticles = (): Article[] => {
        let articles: Article[] = [];

        if (selectedType === 'all') {
            articles = [...hunterArticles, ...htdArticles];
        } else if (selectedType === 'hunter') {
            articles = hunterArticles;
        } else if (selectedType === 'htd') {
            articles = htdArticles;
        }

        // Apply category filter
        if (selectedCategory !== 'All') {
            articles = articles.filter((a) => a.category === selectedCategory);
        }

        // Sort by date descending (newest first) regardless of article type
        articles.sort((a, b) => {
            const dateA = new Date(a.type === 'hunter' ? a.date : a.publishedDate);
            const dateB = new Date(b.type === 'hunter' ? b.date : b.publishedDate);
            return dateB.getTime() - dateA.getTime(); // Newest first
        });

        return articles;
    };
    const filteredArticles = getCombinedArticles();

    // Group articles by year/month
    const grouped: Record<string, Record<string, Article[]>> = {};
    filteredArticles.forEach((article) => {
        const dateStr = article.type === 'hunter' ? article.date : article.publishedDate;
        const date = new Date(dateStr);
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

    // Handle article opening
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

        // Different fetch logic for Hunter vs HTD articles
        if (article.type === 'hunter') {
            const hunterArticle = article as HunterArticle;
            if (hunterArticle.file && (hunterArticle.file.startsWith('http') || hunterArticle.file.startsWith('/'))) {
                fetchAndDisplayArticle(hunterArticle.id, hunterArticle.file);
            } else {
                setOpenArticles(prev => ({
                    ...prev,
                    [hunterArticle.id]: '<div class="text-red-500">Article file path invalid or private.</div>'
                }));
            }
        } else {
            // HTD article - fetch from NGINX
            const htdArticle = article as HTDArticle;
            const htdFileUrl = `/api/htd-articles?id=${htdArticle.id}`;
            fetchAndDisplayArticle(htdArticle.id, htdFileUrl);
        }
    };

    const fetchAndDisplayArticle = (articleId: string, fileUrl: string) => {
        setOpenArticles(prev => ({ ...prev, [articleId]: '' })); // Loading state

        fetch(fileUrl)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.text();
            })
            .then(md => {
                setOpenArticles(prev => ({
                    ...prev,
                    [articleId]: window.marked.parse(md)
                }));
            })
            .catch(() => {
                setOpenArticles(prev => ({
                    ...prev,
                    [articleId]: '<div class="text-red-500">Could not load article.</div>'
                }));
            });
    };

    const getArticleDisplayInfo = (article: Article) => {
        if (article.type === 'hunter') {
            return {
                title: article.headline,
                date: article.date,
                summary: article.summary,
                category: article.category,
                badge: 'Hunter',
                badgeColor: 'bg-orange-600'
            };
        } else {
            return {
                title: article.title,
                date: article.publishedDate,
                summary: article.summary,
                category: article.category,
                badge: 'HTD Research',
                badgeColor: 'bg-blue-600'
            };
        }
    };

    return (
        <section className="max-w-5xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-12">
                {/* Two profile images side by side */}
                <div className="flex items-center gap-8 mb-6">
                    <img
                        src="/images/DB_AI.jpg"
                        alt="DutchBrat"
                        className="object-cover rounded-full border-4 border-purple-600 shadow-xl"
                        style={{ width: '12rem', height: '12rem' }}
                    />
                    <img
                        src="/images/hunter_reading.png"
                        alt="Hunter"
                        className="object-cover rounded-full border-4 border-blue-700 shadow-xl"
                        style={{ width: '12rem', height: '12rem' }}
                    />
                </div>

                <h1 className="text-6xl font-extrabold text-center tracking-tight">
                    Research Articles
                </h1>
                <p className="text-gray-400 mt-2 text-center">
                    Crypto insights from Hunter & Institutional analysis from HTD Research
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                {/* Article Type Filter */}
                <div>
                    <label htmlFor="type-select" className="mr-2 font-semibold">
                        Type:
                    </label>
                    <select
                        id="type-select"
                        className="px-3 py-2 rounded border-2 border-blue-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as 'all' | 'hunter' | 'htd')}
                    >
                        <option value="all">All Articles</option>
                        <option value="hunter">Hunter (Crypto)</option>
                        <option value="htd">HTD Research (Institutional)</option>
                    </select>
                </div>

                {/* Category Filter */}
                <div>
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
                                                    const displayInfo = getArticleDisplayInfo(article);

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
                                                                <h4 className="text-lg font-semibold">{displayInfo.title}</h4>
                                                                <div className="flex gap-2">
                                                                    <span className={`px-3 py-1 text-xs rounded-full text-white ${displayInfo.badgeColor}`}>
                                                                        {displayInfo.badge}
                                                                    </span>
                                                                    {displayInfo.category && (
                                                                        <span className="px-3 py-1 text-xs rounded-full bg-gray-700 text-white">
                                                                            {displayInfo.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-gray-400">
                                                                {new Date(displayInfo.date).toLocaleDateString()}
                                                            </p>
                                                            <p className="mt-2 text-gray-200">{displayInfo.summary}</p>
                                                            {/* Markdown content */}
                                                            {isOpen && (
                                                                <div className="mt-6">
                                                                    {/* HTD Banner - only show for HTD articles */}
                                                                    {article.type === 'htd' && (
                                                                        <div className="mb-6">
                                                                            <img
                                                                                src="/images/HTD_Research_Banner.png"
                                                                                alt="HTD Research"
                                                                                className="w-full h-auto rounded-lg border border-gray-700 shadow-lg"
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {/* Article content */}
                                                                    <div
                                                                        className="prose prose-invert max-w-none"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html:
                                                                                openArticles[article.id] === ""
                                                                                    ? "<div>Loading...</div>"
                                                                                    : openArticles[article.id] || ""
                                                                        }}
                                                                    />
                                                                </div>
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

            {filteredArticles.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                    <p>No articles found matching your filters.</p>
                </div>
            )}
        </section>
    );
}