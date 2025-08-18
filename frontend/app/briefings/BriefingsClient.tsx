// frontend/app/briefings/BriefingsClient.tsx
'use client';

import { useEffect, useState } from 'react';

// Helper to get query param from URL
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
};

export default function BriefingsClient() {
    const [briefings, setBriefings] = useState<Briefing[]>([]);
    const [periods, setPeriods] = useState<string[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
    const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
    const [openBriefings, setOpenBriefings] = useState<Record<string, boolean>>({});

    // Fetch briefings
    useEffect(() => {
        fetch('/api/briefings')
            .then((res) => res.json())
            .then((data: Briefing[]) => {
                setBriefings(data);
                const uniquePeriods = Array.from(
                    new Set(data.map(b => b.period).filter((period): period is string => !!period))
                );
                setPeriods(uniquePeriods);
            })
            .catch((err) => console.error('Failed to load briefings:', err));
    }, []);

    // Auto-open briefing if ?briefingId=... in query string
    useEffect(() => {
        const briefingId = getBriefingIdFromQuery();
        if (briefingId && briefings.length > 0 && !openBriefings[briefingId]) {
            const briefing = briefings.find(b => b.id === briefingId);
            if (briefing) {
                // Auto-expand the year and month for this briefing
                const date = new Date(briefing.date);
                const year = date.getFullYear().toString();
                const month = date.toLocaleString('default', { month: 'long' });
                const monthKey = `${year}-${month}`;

                // Expand the year and month
                setExpandedYears(prev => ({ ...prev, [year]: true }));
                setExpandedMonths(prev => ({ ...prev, [monthKey]: true }));

                // Open the briefing (show PDF)
                setOpenBriefings(prev => ({ ...prev, [briefingId]: true }));
            }
        }
    }, [briefings, openBriefings]);

    // Filtering/grouping logic
    const filteredBriefings = selectedPeriod === 'All'
        ? briefings
        : briefings.filter(b => b.period === selectedPeriod);

    // Group by year and month
    const groupedBriefings = filteredBriefings.reduce((acc, briefing) => {
        const date = new Date(briefing.date);
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });

        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = [];
        acc[year][month].push(briefing);

        return acc;
    }, {} as Record<string, Record<string, Briefing[]>>);

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

    const formatPeriod = (period: string): string => {
        return period.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <section className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">📊 Market Briefings</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
                Daily macro briefings with market analysis, equity updates, and economic insights.
            </p>

            {/* Period Filter */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedPeriod('All')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'All'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {formatPeriod(period)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Briefings List */}
            <div className="space-y-4">
                {Object.keys(groupedBriefings)
                    .sort((a, b) => parseInt(b) - parseInt(a)) // Sort years descending
                    .map(year => (
                        <div key={year} className="border border-gray-300 dark:border-gray-600 rounded-lg">
                            <button
                                onClick={() => toggleYear(year)}
                                className="w-full px-4 py-3 text-left font-semibold text-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex justify-between items-center"
                            >
                                <span>{year}</span>
                                <span className="text-gray-500">
                                    {expandedYears[year] ? '▼' : '▶'}
                                </span>
                            </button>

                            {expandedYears[year] && (
                                <div className="p-4 space-y-4">
                                    {Object.keys(groupedBriefings[year])
                                        .sort((a, b) => {
                                            const monthA = new Date(`${a} 1, ${year}`).getMonth();
                                            const monthB = new Date(`${b} 1, ${year}`).getMonth();
                                            return monthB - monthA; // Sort months descending
                                        })
                                        .map(month => {
                                            const monthKey = `${year}-${month}`;
                                            return (
                                                <div key={month}>
                                                    <button
                                                        onClick={() => toggleMonth(year, month)}
                                                        className="w-full px-3 py-2 text-left font-medium bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors flex justify-between items-center"
                                                    >
                                                        <span>{month} {year}</span>
                                                        <span className="text-gray-500 text-sm">
                                                            {groupedBriefings[year][month].length} briefings
                                                            {expandedMonths[monthKey] ? ' ▼' : ' ▶'}
                                                        </span>
                                                    </button>

                                                    {expandedMonths[monthKey] && (
                                                        <div className="mt-2 space-y-2 pl-4">
                                                            {groupedBriefings[year][month].map(briefing => {
                                                                const isOpen = openBriefings[briefing.id];
                                                                return (
                                                                    <div key={briefing.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                                                {briefing.title}
                                                                            </h3>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="px-3 py-1 text-xs rounded-full bg-blue-700 text-white">
                                                                                    {formatPeriod(briefing.period)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-sm text-gray-400 mb-3">
                                                                            {new Date(briefing.date).toLocaleDateString()}
                                                                        </p>

                                                                        <div className="flex gap-3 mb-3">
                                                                            <button
                                                                                onClick={() => toggleBriefing(briefing.id)}
                                                                                className="text-sm text-blue-400 hover:underline transition-colors"
                                                                            >
                                                                                {isOpen ? '📄 Hide PDF' : '📄 View PDF'}
                                                                            </button>

                                                                            {briefing.tweetUrl && (
                                                                                <a
                                                                                    href={briefing.tweetUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-sm text-blue-400 hover:underline transition-colors"
                                                                                >
                                                                                    🐦 View Tweet
                                                                                </a>
                                                                            )}
                                                                        </div>

                                                                        {/* PDF Embed */}
                                                                        {isOpen && (
                                                                            <div className="mt-4">
                                                                                <iframe
                                                                                    src={briefing.pdfUrl}
                                                                                    width="100%"
                                                                                    height="600"
                                                                                    className="border border-gray-300 rounded"
                                                                                    title={`PDF: ${briefing.title}`}
                                                                                >
                                                                                    <p>
                                                                                        Your browser does not support PDFs.
                                                                                        <a href={briefing.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                                                            Download the PDF
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
        </section>
    );
}