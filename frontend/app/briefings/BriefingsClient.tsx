// BriefingsClient.tsx - Dark theme only version
'use client'

import { useState, useEffect } from 'react'

interface Briefing {
    id: string
    title: string
    date: string
    period: string
    pdfUrl: string
    tweetUrl?: string
}

type GroupedBriefings = {
    [year: string]: {
        [month: string]: Briefing[]
    }
}

const formatPeriod = (period: string): string => {
    const periodMap: { [key: string]: string } = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'special': 'Special'
    }
    return periodMap[period] || period
}

export default function BriefingsClient() {
    const [briefings, setBriefings] = useState<Briefing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedPeriod, setSelectedPeriod] = useState<string>('All')
    const [expandedYears, setExpandedYears] = useState<{ [key: string]: boolean }>({})
    const [expandedMonths, setExpandedMonths] = useState<{ [key: string]: boolean }>({})
    const [openBriefings, setOpenBriefings] = useState<{ [key: string]: boolean }>({})

    useEffect(() => {
        fetchBriefings()
    }, [])

    const fetchBriefings = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/briefings')

            if (!response.ok) {
                throw new Error(`Failed to fetch briefings: ${response.status}`)
            }

            const data: Briefing[] = await response.json()
            setBriefings(data)
        } catch (err) {
            console.error('Error fetching briefings:', err)
            setError('Failed to load briefings')
        } finally {
            setLoading(false)
        }
    }

    const filteredBriefings = selectedPeriod === 'All' 
        ? briefings 
        : briefings.filter(b => b.period === selectedPeriod)

    const groupedBriefings: GroupedBriefings = filteredBriefings.reduce((acc, briefing) => {
        const date = new Date(briefing.date)
        const year = date.getFullYear().toString()
        const month = date.toLocaleString('default', { month: 'long' })
        
        if (!acc[year]) acc[year] = {}
        if (!acc[year][month]) acc[year][month] = []
        acc[year][month].push(briefing)
        
        return acc
    }, {} as GroupedBriefings)

    const periods = Array.from(new Set(briefings.map(b => b.period)))

    const toggleYear = (year: string) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }))
    }

    const toggleMonth = (year: string, month: string) => {
        const monthKey = `${year}-${month}`
        setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }))
    }

    const toggleBriefing = (briefingId: string) => {
        setOpenBriefings(prev => ({ ...prev, [briefingId]: !prev[briefingId] }))
    }

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
        )
    }

    if (error) {
        return (
            <section className="max-w-5xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6 text-white">📊 Market Briefings</h1>
                <div className="text-center py-8">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button 
                        onClick={fetchBriefings}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-white">📊 Market Briefings</h1>
            <p className="text-blue-400 mb-8">
                Daily macro briefings with market analysis, equity updates, and economic insights.
            </p>

            {/* Period Filter */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedPeriod('All')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'All'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-blue-400 hover:bg-gray-600'
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
                                    : 'bg-gray-700 text-blue-400 hover:bg-gray-600'
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
                        <div key={year} className="border border-gray-600 rounded-lg">
                            <button
                                onClick={() => toggleYear(year)}
                                className="w-full px-4 py-3 text-left font-semibold text-lg bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex justify-between items-center text-white"
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
                                                        className="w-full px-3 py-2 text-left font-medium bg-gray-700 hover:bg-gray-600 rounded transition-colors flex justify-between items-center text-blue-400"
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
                                                                    <div key={briefing.id} className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <h3 className="font-semibold text-white">
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