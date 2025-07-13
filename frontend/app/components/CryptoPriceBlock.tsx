'use client'

import { useEffect, useState } from 'react'

type Prices = {
    [key: string]: {
        usd: number
        usd_24h_change: number
    }
}

// Map token names to Binance symbol pairs
const SYMBOLS = [
    { id: 'bitcoin', label: 'BTC', pair: 'BTCUSDT' },
    { id: 'ethereum', label: 'ETH', pair: 'ETHUSDT' },
    { id: 'solana', label: 'SOL', pair: 'SOLUSDT' },
    { id: 'dogecoin', label: 'DOGE', pair: 'DOGEUSDT' },
    { id: 'xrp', label: 'XRP', pair: 'XRPUSDT' },
];

export default function CryptoPriceBlock() {
    const [prices, setPrices] = useState<Prices>({})

    useEffect(() => {
        const fetchPrices = async () => {
            const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
            const data = await res.json()

            // Build object in your desired structure
            let priceObj: Prices = {};
            for (const { id, pair } of SYMBOLS) {
                const ticker = data.find((t: any) => t.symbol === pair)
                if (ticker) {
                    priceObj[id] = {
                        usd: parseFloat(ticker.lastPrice),
                        usd_24h_change: parseFloat(ticker.priceChangePercent),
                    }
                }
            }
            setPrices(priceObj)
        }

        fetchPrices()
        const interval = setInterval(fetchPrices, 300_000) // refresh every 5 min

        return () => clearInterval(interval)
    }, [])

    if (Object.keys(prices).length === 0) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-center items-center mb-10">
                <span className="text-gray-400">Loading crypto prices…</span>
            </div>
        )
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap justify-center gap-4 mb-10">
            {SYMBOLS.map(({ id, label }) => {
                const value = prices[id]
                if (!value) return null
                return (
                    <div key={id} className="text-center min-w-[90px]">
                        <p className="uppercase text-sm text-gray-400">{label}</p>
                        <p className="text-xl font-bold">${value.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</p>
                        <p className={`text-sm ${value.usd_24h_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {value.usd_24h_change >= 0 ? '▲' : '▼'} {value.usd_24h_change.toFixed(2)}%
                        </p>
                    </div>
                )
            })}
        </div>
    )
}
