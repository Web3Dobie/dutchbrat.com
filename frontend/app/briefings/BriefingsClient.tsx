'use client';

import { useEffect, useState } from 'react';
import NotionBlockRenderer from '../components/NotionBlockRenderer';

// Helper to get query param from URL (Next.js 13/14 compatible)
function getBriefingIdFromQuery(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('briefingId');
}

type NotionBlock = {
    id: string;
    type: string;
    hasChildren: boolean;
    content: any;
    children?: NotionBlock[];
};

type Briefing = {
    id: string;
    title: string;
    period: string;
    date: string;
    pageUrl: string;
    tweetUrl?: string;
    marketSentiment?: string;
    content: NotionBlock[];
};

type GroupedBriefings = Record<string, Record<string, Briefing[]>>;

interface BriefingsResponse {
    data: Briefing[];
    pagination: {
        hasMore: boolean;
        nextCursor?: string;
    };
}

export default function BriefingsClient() {
    const [briefings, setBriefings] = useState<Briefing[]>([]);
    const [periods, setPeriods] = useState<string[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
    const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
    const [selectedBriefingId, setSelectedBriefingId] = useState<string | null>(null); // New state for selection
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        async function fetchBriefings() {
            try {
                setLoading(true);
                const response = await fetch('/api/briefings');
                if (!response.ok) throw new Error('Failed to fetch briefings');

                const apiResponse: BriefingsResponse = await response.json();
                const data = apiResponse.data;
                setBriefings(data);

                const uniquePeriods = Array.from(new Set(data.map(b => b.period).filter(Boolean)));
                setPeriods(uniquePeriods);

                // --- START OF FIX ---

                // Correctly type the variable to hold a Briefing or null
                let briefingToShow: Briefing | null = null;

                const briefingIdFromQuery = getBriefingIdFromQuery();
                if (briefingIdFromQuery) {
                    // .find() returns Briefing or undefined, so we handle the undefined case
                    const foundBriefing = data.find(b => b.id === briefingIdFromQuery);
                    if (foundBriefing) {
                        briefingToShow = foundBriefing;
                    } else {
                        console.warn(`Briefing with ID ${briefingIdFromQuery} not found. Defaulting to most recent.`);
                        briefingToShow = data.length > 0 ? data[0] : null;
                    }
                } else if (data.length > 0) {
                    briefingToShow = data[0];
                }

                if (briefingToShow) {
                    const date = new Date(briefingToShow.date);
                    const year = date.getFullYear().toString();
                    const month = date.toLocaleString('default', { month: 'long' });
                    setExpandedYears(prev => ({ ...prev, [year]: true }));
                    setExpandedMonths(prev => ({ ...prev, [`${year}-${month}`]: true }));
                    setSelectedBriefingId(briefingToShow.id);
                } else {
                    setSelectedBriefingId(null);
                }
                
                // --- END OF FIX ---

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

    const filteredBriefings = selectedPeriod === 'All'
        ? briefings
        : briefings.filter(b => b.period === selectedPeriod);

    const groupedBriefings: GroupedBriefings = filteredBriefings.reduce((acc, briefing) => {
        const date = new Date(briefing.date);
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });

        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = [];
        acc[year][month].push(briefing);

        return acc;
    }, {} as GroupedBriefings);

    const selectedBriefing = briefings.find(b => b.id === selectedBriefingId);

    const toggleYear = (year: string) => setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    const toggleMonth = (year: string, month: string) => {
        const monthKey = `${year}-${month}`;
        setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
    };

    if (loading) {
        return (
            <section className="max-w-5xl mx-auto px-4 py-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3 mb-8"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (<div key={i} className="h-16 bg-gray-700 rounded"></div>))}
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
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Try Again</button>
                </div>
            </section>
        );
    }

    return (
        <section className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex flex-col items-center mb-12">
                <img src="/images/HTD_Research_Banner.png" alt="HTD Banner" className="object-cover border-4 border-blue-700 shadow-xl mb-6 w-full max-w-2xl" style={{ height: 'auto' }} />
                <h1 className="text-4xl font-extrabold text-center tracking-tight text-white mb-4">📊 Daily Market Briefings</h1>
                <p className="text-lg text-blue-400 text-center max-w-2xl">
                    Comprehensive market analysis with equity updates, macro insights, and economic data. Generated daily across pre-market, morning, mid-day, and after-market sessions.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* --- Sidebar (Navigation) --- */}
                <aside className="w-full md:w-1/3 lg:w-1/4">
                    <div className="sticky top-8">
                        <h2 className="text-lg font-bold text-white mb-4">Browse Briefings</h2>
                        <div className="mb-6">
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setSelectedPeriod('All')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedPeriod === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>All</button>
                                {periods.map(period => (
                                    <button key={period} onClick={() => setSelectedPeriod(period)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedPeriod === period ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                        {formatPeriod(period)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {Object.keys(groupedBriefings).sort((a, b) => parseInt(b) - parseInt(a)).map(year => (
                                <div key={year}>
                                    <button onClick={() => toggleYear(year)} className="w-full px-2 py-2 text-left flex justify-between items-center hover:bg-gray-700 rounded-md transition-colors">
                                        <h3 className="text-md font-bold text-white">{year}</h3>
                                        <span className="text-gray-400 text-sm">{expandedYears[year] ? '▼' : '▶'}</span>
                                    </button>
                                    {expandedYears[year] && (
                                        <div className="pl-2 mt-1 space-y-1">
                                            {Object.keys(groupedBriefings[year]).sort((a, b) => new Date(`01 ${b} 2000`).getMonth() - new Date(`01 ${a} 2000`).getMonth()).map(month => {
                                                const monthKey = `${year}-${month}`;
                                                return (
                                                    <div key={monthKey}>
                                                        <button onClick={() => toggleMonth(year, month)} className="w-full px-2 py-1.5 text-left flex justify-between items-center hover:bg-gray-600 rounded-md transition-colors">
                                                            <h4 className="text-sm font-semibold text-blue-400">{month}</h4>
                                                            <span className="text-gray-500 text-xs">{expandedMonths[monthKey] ? '▼' : '▶'}</span>
                                                        </button>
                                                        {expandedMonths[monthKey] && (
                                                            <div className="pl-2 mt-1 space-y-1">
                                                                {groupedBriefings[year][month].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(briefing => (
                                                                    <button key={briefing.id} onClick={() => setSelectedBriefingId(briefing.id)} className={`w-full text-left p-2 rounded-md transition-colors text-sm ${selectedBriefingId === briefing.id ? 'bg-blue-700 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700'}`}>
                                                                        {new Date(briefing.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {formatPeriod(briefing.period)}
                                                                    </button>
                                                                ))}
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
                    </div>
                </aside>

                {/* --- Main Content Area --- */}
                <main className="w-full md:w-2/3 lg:w-3/4">
                    {selectedBriefing ? (
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
                            <div className="flex justify-between items-start mb-1">
                                <h1 className="text-3xl font-bold text-white">{selectedBriefing.title}</h1>
                                <span className="px-3 py-1 text-xs rounded-full bg-blue-700 text-white flex-shrink-0 ml-4">{formatPeriod(selectedBriefing.period)}</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                                {new Date(selectedBriefing.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>

                            {selectedBriefing.marketSentiment && (
                                <div className="bg-gray-700 border border-gray-500 rounded-lg p-3 mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-medium text-blue-400">💭 Market Sentiment</span>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed">{selectedBriefing.marketSentiment}</p>
                                </div>
                            )}

                            {selectedBriefing.tweetUrl && (
                                <div className="mb-6">
                                    <a href={selectedBriefing.tweetUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline transition-colors">🐦 View on X (Twitter) →</a>
                                </div>
                            )}

                            <hr className="border-gray-600 my-6" />

                            <NotionBlockRenderer
                                blocks={selectedBriefing.content}
                                className="prose prose-invert max-w-none"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-96 bg-gray-800 border border-gray-600 rounded-lg">
                            <p className="text-gray-400">
                                {filteredBriefings.length > 0 ? 'Select a briefing from the navigation to view it.' : 'No briefings available for the selected period.'}
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </section>
    );
}