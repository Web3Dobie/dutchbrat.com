'use client';

import { useEffect, useState } from 'react';

// Helper to get query param from URL (Next.js 13/14 compatible)
function getBriefingIdFromQuery(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('briefingId');
}

type Briefing = {
    id: string;
    title: string;
    period: string;
    date: string;
    pdfUrl: string;
    tweetUrl?: string;
    marketSentiment?: string; // Added market sentiment field
};

type GroupedBriefings = Record<string, Record<string, Briefing[]>>;

export default function BriefingsClient() {
    const [briefings, setBriefings] = useState<Briefing[]>([]);
    const [periods, setPeriods] = useState<string[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
    const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
    const [openBriefings, setOpenBriefings] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    // Load briefings data
    useEffect(() => {
        async function fetchBriefings() {
            try {
                setLoading(true);
                const response = await fetch('/api/briefings');
                if (!response.ok) throw new Error('Failed to fetch briefings');

                const data: Briefing[] = await response.json();
                setBriefings(data);

                const uniquePeriods = Array.from(new Set(data.map(b => b.period).filter(Boolean)));
                setPeriods(uniquePeriods);

                // Auto-open specific briefing if briefingId in URL
                const briefingId = getBriefingIdFromQuery();
                if (briefingId) {
                    const briefing = data.find(b => b.id === briefingId);
                    if (briefing) {
                        const date = new Date(briefing.date);
                        const year = date.getFullYear().toString();
                        const month = date.toLocaleString('default', { month: 'long' });

                        // Auto-expand the relevant year and month
                        setExpandedYears(prev => ({ ...prev, [year]: true }));
                        setExpandedMonths(prev => ({ ...prev, [`${year}-${month}`]: true }));
                        setOpenBriefings(prev => ({ ...prev, [briefingId]: true }));
                    }
                }

                setLoading(false);
            } catch (err: any) {
                setError(err.message || 'Failed to load briefings');
                setLoading(false);
            }
        }

        fetchBriefings();
    }, []);

    const formatPeriod = (period: string): string => {
        if (!period) return '';
        return period.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Filter briefings by selected period
    const filteredBriefings = selectedPeriod === 'All'
        ? briefings
        : briefings.filter(b => b.period === selectedPeriod);

    // Group briefings by year and month
    const groupedBriefings: GroupedBriefings = filteredBriefings.reduce((acc, briefing) => {
        const date = new Date(briefing.date);
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });

        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = [];
        acc[year][month].push(briefing);

        return acc;
    }, {} as GroupedBriefings);

    const toggleYear = (year: string) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    const toggleMonth = (year: string, month: string) => {
        const monthKey = `${year}-${month}`;
        setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
    };

    const toggleBriefing = (briefingId: string) => {
        setOpenBriefings(prev => ({ ...prev, [briefingId]: !prev[briefingId] }));
    };

    if (loading) {
        return (
            <section className="max-w-5xl mx-auto px-4 py-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3 mb-8"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="max-w-5xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6 text-white">📊 Market Briefings</h1>
                <div className="text-center py-8">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="max-w-5xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-12">
                <img
                    src="/images/HTD_Research_Logo.jpg"
                    alt="HTD Logo"
                    className="object-cover border-4 border-blue-700 shadow-xl mb-6"
                    style={{ width: '16rem', height: 'auto' }}
                />
                <h1 className="text-4xl font-extrabold text-center tracking-tight text-white mb-4">
                    📊 Daily Market Briefings
                </h1>
                <p className="text-lg text-blue-400 text-center max-w-2xl">
                    Comprehensive market analysis with equity updates, macro insights, and economic data.
                    Generated daily across pre-market, morning, mid-day, and after-market sessions.
                </p>
            </div>

            {/* Period Filter */}
            <div className="mb-8">
                <div className="flex flex-wrap gap-2 justify-center">
                    <button
                        onClick={() => setSelectedPeriod('All')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'All'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        All Periods
                    </button>
                    {periods.map(period => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === period
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {formatPeriod(period)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Briefings Grouped by Year and Month */}
            <div className="space-y-6">
                {Object.keys(groupedBriefings)
                    .sort((a, b) => parseInt(b) - parseInt(a)) // Newest year first
                    .map(year => (
                        <div key={year} className="border border-gray-600 rounded-lg bg-gray-800">
                            <button
                                onClick={() => toggleYear(year)}
                                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-700 transition-colors"
                            >
                                <h2 className="text-xl font-bold text-white">{year}</h2>
                                <span className="text-gray-400 text-lg">
                                    {expandedYears[year] ? '▼' : '▶'}
                                </span>
                            </button>

                            {expandedYears[year] && (
                                <div className="px-6 pb-4 space-y-4">
                                    {Object.keys(groupedBriefings[year])
                                        .sort((a, b) => {
                                            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                                                'July', 'August', 'September', 'October', 'November', 'December'];
                                            return months.indexOf(b) - months.indexOf(a); // Newest month first
                                        })
                                        .map(month => {
                                            const monthKey = `${year}-${month}`;
                                            return (
                                                <div key={month} className="border border-gray-600 rounded-lg bg-gray-700">
                                                    <button
                                                        onClick={() => toggleMonth(year, month)}
                                                        className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-600 transition-colors"
                                                    >
                                                        <h3 className="text-lg font-semibold text-blue-400">
                                                            {month} {year} ({groupedBriefings[year][month].length} briefings)
                                                        </h3>
                                                        <span className="text-gray-400">
                                                            {expandedMonths[monthKey] ? '▼' : '▶'}
                                                        </span>
                                                    </button>

                                                    {expandedMonths[monthKey] && (
                                                        <div className="px-4 pb-4 space-y-3">
                                                            {groupedBriefings[year][month]
                                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
                                                                .map(briefing => {
                                                                    const isOpen = openBriefings[briefing.id];
                                                                    return (
                                                                        <div key={briefing.id} className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <h4 className="font-semibold text-white text-lg">
                                                                                    {briefing.title}
                                                                                </h4>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="px-3 py-1 text-xs rounded-full bg-blue-700 text-white">
                                                                                        {formatPeriod(briefing.period)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-sm text-gray-400 mb-3">
                                                                                {new Date(briefing.date).toLocaleDateString('en-US', {
                                                                                    weekday: 'long',
                                                                                    year: 'numeric',
                                                                                    month: 'long',
                                                                                    day: 'numeric'
                                                                                })}
                                                                            </p>

                                                                            {/* Market Sentiment Display */}
                                                                            {briefing.marketSentiment && (
                                                                                <div className="bg-gray-700 border border-gray-500 rounded-lg p-3 mb-3">
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        <span className="text-xs font-medium text-blue-400">💭 Market Sentiment</span>
                                                                                    </div>
                                                                                    <p className="text-sm text-gray-300 leading-relaxed">
                                                                                        {briefing.marketSentiment}
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            <div className="flex gap-3 mb-3">
                                                                                <button
                                                                                    onClick={() => toggleBriefing(briefing.id)}
                                                                                    className="text-sm text-blue-400 hover:underline transition-colors"
                                                                                >
                                                                                    {isOpen ? '📄 Hide PDF' : '📄 View PDF'} →
                                                                                </button>

                                                                                <a
                                                                                    href={briefing.pdfUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-sm text-blue-400 hover:underline transition-colors"
                                                                                >
                                                                                    📥 Download PDF →
                                                                                </a>

                                                                                {briefing.tweetUrl && (
                                                                                    <a
                                                                                        href={briefing.tweetUrl}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-sm text-blue-400 hover:underline transition-colors"
                                                                                    >
                                                                                        🐦 View Tweet →
                                                                                    </a>
                                                                                )}
                                                                            </div>

                                                                            {/* PDF Viewer (when open) */}
                                                                            {isOpen && briefing.pdfUrl && (
                                                                                <div className="mt-4 border border-gray-600 rounded-lg overflow-hidden">
                                                                                    <div className="bg-gray-700 px-4 py-2 text-sm text-gray-300">
                                                                                        📄 {briefing.title} - {formatPeriod(briefing.period)} Briefing
                                                                                        {briefing.marketSentiment && (
                                                                                            <span className="ml-2 text-blue-400">• Market sentiment included</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <iframe
                                                                                        src={`${briefing.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                                                                                        width="100%"
                                                                                        height="600"
                                                                                        style={{ border: 'none' }}
                                                                                        title={`${briefing.title} PDF`}
                                                                                        onError={() => {
                                                                                            console.error('PDF load error for:', briefing.pdfUrl);
                                                                                        }}
                                                                                    >
                                                                                        <p className="p-4 text-gray-400">
                                                                                            Your browser doesn't support embedded PDFs.
                                                                                            <a
                                                                                                href={briefing.pdfUrl}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="text-blue-400 hover:underline ml-1"
                                                                                            >
                                                                                                Download the PDF instead
                                                                                            </a>
                                                                                        </p>
                                                                                    </iframe>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    ))}
            </div>

            {filteredBriefings.length === 0 && !loading && (
                <div className="text-center py-12">
                    <p className="text-gray-400 text-lg">
                        {selectedPeriod === 'All'
                            ? 'No briefings available yet.'
                            : `No ${formatPeriod(selectedPeriod)} briefings available.`
                        }
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                        Check back soon for fresh market analysis 📊
                    </p>
                </div>
            )}
        </section>
    );
}