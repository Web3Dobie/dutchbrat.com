'use client'

import { useState, useEffect } from 'react'

interface TreeData {
    [year: number]: {
        [month: string]: {
            [date: string]: number
        }
    }
}

export default function BriefingsArchive() {
    const [tree, setTree] = useState<TreeData | null>(null)
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([2025]))
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
    const [briefingsByDate, setBriefingsByDate] = useState<Record<string, any[]>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTree()
    }, [])

    const fetchTree = async () => {
        try {
            const res = await fetch('/api/briefings?tree-metadata=true')
            const data = await res.json()
            setTree(data.tree)
            setLoading(false)
        } catch (err) {
            console.error('Failed to fetch tree:', err)
            setLoading(false)
        }
    }

    const fetchBriefingsForDate = async (date: string) => {
        if (briefingsByDate[date]) return

        try {
            const res = await fetch(`/api/briefings?date=${date}`)
            const data = await res.json()
            setBriefingsByDate(prev => ({ ...prev, [date]: data.data }))
        } catch (err) {
            console.error(`Failed to fetch briefings for ${date}:`, err)
        }
    }

    const toggleYear = (year: number) => {
        const newSet = new Set(expandedYears)
        if (newSet.has(year)) {
            newSet.delete(year)
        } else {
            newSet.add(year)
        }
        setExpandedYears(newSet)
    }

    const toggleMonth = (yearMonth: string) => {
        const newSet = new Set(expandedMonths)
        if (newSet.has(yearMonth)) {
            newSet.delete(yearMonth)
        } else {
            newSet.add(yearMonth)
        }
        setExpandedMonths(newSet)
    }

    const toggleDate = (date: string) => {
        const newSet = new Set(expandedDates)
        if (newSet.has(date)) {
            newSet.delete(date)
        } else {
            newSet.add(date)
            fetchBriefingsForDate(date)
        }
        setExpandedDates(newSet)
    }

    if (loading) {
        return <div className="text-gray-400">Loading archive...</div>
    }

    if (!tree) {
        return <div className="text-red-400">Failed to load archive</div>
    }

    return (
        <div className="space-y-2">
            {Object.entries(tree).map(([yearStr, months]) => {
                const year = parseInt(yearStr)
                const monthsRecord = months as Record<string, Record<string, number>>
                const totalBriefings = Object.values(monthsRecord).reduce(
                    (sum, dates) => sum + Object.values(dates).reduce((s, c) => s + c, 0),
                    0
                )

                return (
                    <div key={yearStr}>
                        <button
                            onClick={() => toggleYear(year)}
                            className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-750 rounded-lg flex items-center justify-between"
                        >
                            <span className="font-semibold text-lg">
                                {expandedYears.has(year) ? '▼' : '▶'} {yearStr}
                            </span>
                            <span className="text-sm text-gray-400">{totalBriefings} briefings</span>
                        </button>

                        {expandedYears.has(year) && (
                            <div className="ml-6 mt-2 space-y-2">
                                {Object.entries(monthsRecord).map(([month, dates]) => {
                                    const datesRecord = dates as Record<string, number>
                                    const monthKey = `${yearStr}-${month}`
                                    const monthTotal = Object.values(datesRecord).reduce((s, c) => s + c, 0)

                                    return (
                                        <div key={monthKey}>
                                            <button
                                                onClick={() => toggleMonth(monthKey)}
                                                className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-650 rounded flex items-center justify-between"
                                            >
                                                <span className="font-medium">
                                                    {expandedMonths.has(monthKey) ? '▼' : '▶'} {month}
                                                </span>
                                                <span className="text-sm text-gray-400">{monthTotal} briefings</span>
                                            </button>

                                            {expandedMonths.has(monthKey) && (
                                                <div className="ml-6 mt-2 space-y-1">
                                                    {Object.entries(datesRecord).map(([date, count]) => (
                                                        <div key={date}>
                                                            <button
                                                                onClick={() => toggleDate(date)}
                                                                className="w-full text-left px-4 py-2 bg-gray-600 hover:bg-gray-550 rounded flex items-center justify-between text-sm"
                                                            >
                                                                <span>
                                                                    {expandedDates.has(date) ? '▼' : '▶'} {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                </span>
                                                                <span className="text-gray-400">{count} briefings</span>
                                                            </button>

                                                            {expandedDates.has(date) && briefingsByDate[date] && (
                                                                <div className="ml-6 mt-1 space-y-1">
                                                                    {briefingsByDate[date].map((briefing) => (
                                                                        <a
                                                                            key={briefing.id}
                                                                            href={`/briefings?briefingId=${briefing.id}`}
                                                                            className="block px-4 py-2 bg-gray-500 hover:bg-blue-600 rounded text-sm transition-colors"
                                                                        >
                                                                            {briefing.title}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}