'use client';

import React, { useEffect, useState } from 'react';

// Extend Window interface to include marked
declare global {
  interface Window {
    marked: {
      parse: (md: string) => string;
    };
  }
}

// Helper to get query param from URL (Next.js 13/14 compatible)
function getArticleIdFromQuery(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('articleId');
}

type Article = {
  id: string;
  headline: string;
  summary: string;
  image: string;
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
      script.onload = () => console.log('✅ marked.min.js loaded');
      document.body.appendChild(script);
    }
  }, []);

  // Fetch articles
  useEffect(() => {
    fetch('/api/articles')
      .then(res => res.json())
      .then((data: Article[]) => {
        setArticles(data);
        const uniqueCategories = Array.from(
          new Set(
            data.map(a => a.category).filter((c): c is string => !!c)
          )
        );
        setCategories(uniqueCategories);
      })
      .catch(err => console.error('Failed to load articles:', err));
  }, []);

  // Auto-open if articleId query param present
  useEffect(() => {
    const articleId = getArticleIdFromQuery();
    if (articleId && articles.length > 0) {
      const a = articles.find(x => x.id === articleId);
      if (a) {
        const date = new Date(a.date);
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });
        setExpandedYears(prev => ({ ...prev, [year]: true }));
        setExpandedMonths(prev => ({ ...prev, [`${year}-${month}`]: true }));
        handleToggleArticle(a);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

  // Group articles by year -> month
  const filtered =
    selectedCategory === 'All'
      ? articles
      : articles.filter(a => a.category === selectedCategory);

  const grouped: Record<string, Record<string, Article[]>> = {};
  filtered.forEach(a => {
    const d = new Date(a.date);
    const y = d.getFullYear().toString();
    const m = d.toLocaleString('default', { month: 'long' });
    grouped[y] = grouped[y] || {};
    grouped[y][m] = grouped[y][m] || [];
    grouped[y][m].push(a);
  });

  const toggleYear = (year: string) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };
  const toggleMonth = (year: string, month: string) => {
    const key = `${year}-${month}`;
    setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleArticle = (article: Article) => {
    if (openArticles[article.id] !== undefined) {
      setOpenArticles(prev => {
        const nxt = { ...prev };
        delete nxt[article.id];
        return nxt;
      });
      return;
    }
    // Fetch markdown content
    if (article.file) {
      setOpenArticles(prev => ({ ...prev, [article.id]: '' }));
      fetch(article.file)
        .then(res => res.text())
        .then(md => {
          const html = window.marked.parse(md);
          setOpenArticles(prev => ({ ...prev, [article.id]: html }));
        })
        .catch(() => {
          setOpenArticles(prev => ({
            ...prev,
            [article.id]: '<div class="text-red-500">Could not load article.</div>'
          }));
        });
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      {/* Category filter */}
      <div className="mb-6">
        <label className="mr-2 font-semibold">Category:</label>
        <select
          className="px-3 py-2 rounded border-2 border-blue-700 bg-gray-900 text-white"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="All">All</option>
          {categories.map(cat => (
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
          .map(year => (
            <div key={year}>
              <button
                className="flex items-center gap-2 text-2xl font-bold mb-2"
                onClick={() => toggleYear(year)}
              >
                <span>{expandedYears[year] ? '▼' : '▶'}</span>
                {year}
              </button>

              {expandedYears[year] &&
                Object.keys(grouped[year]).map(month => {
                  const monthKey = `${year}-${month}`;
                  return (
                    <div key={month} className="ml-4 mb-4">
                      <button
                        className="flex items-center gap-2 text-xl font-semibold mb-2"
                        onClick={() => toggleMonth(year, month)}
                      >
                        <span>{expandedMonths[monthKey] ? '▼' : '▶'}</span>
                        {month}
                      </button>

                      {expandedMonths[monthKey] &&
                        grouped[year][month].map(article => {
                          const isOpen = openArticles[article.id] !== undefined;
                          return (
                            <div
                              key={article.id}
                              className={
                                `rounded-xl border p-5 mb-4 bg-black/10 backdrop-blur-md hover:border-blue-500 transition cursor-pointer ${
                                  isOpen ? 'border-blue-500' : 'border-gray-700'
                                }`
                              }
                              onClick={() => handleToggleArticle(article)}
                            >
                              <div className="flex justify-between items-center">
                                <h4 className="text-lg font-semibold">
                                  {article.headline}
                                </h4>
                                {article.category && (
                                  <span className="px-3 py-1 text-xs rounded-full bg-blue-700 text-white">
                                    {article.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400">
                                {new Date(article.date).toLocaleDateString()}
                              </p>
                              <p className="mt-2 text-gray-200">{article.summary}</p>

                              {isOpen && (
                                <div
                                  className="prose prose-invert mt-6"
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      openArticles[article.id] === ''
                                        ? '<div>Loading...</div>'
                                        : openArticles[article.id] || ''
                                  }}
                                />
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )
                })}
            </div>
          ))}
      </div>
    </section>
  )
}