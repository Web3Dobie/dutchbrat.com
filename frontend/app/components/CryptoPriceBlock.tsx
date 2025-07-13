'use client'

import { useEffect, useState } from 'react'

type Prices = {
    [key: string]: {
        usd: number
        usd_24h_change: number
    }
}

const SYMBOLS = [
    { id: 'bitcoin', label: 'BTC', pair: 'BTCUSDT', icon: '1' },
    { id: 'ethereum', label: 'ETH', pair: 'ETHUSDT', icon: '279' },
    { id: 'solana', label: 'SOL', pair: 'SOLUSDT', icon: '4128' },
    { id: 'dogecoin', label: 'DOGE', pair: 'DOGEUSDT', icon: '5' },
    { id: 'xrp', label: 'XRP', pair: 'XRPUSDT', icon: '44' },
];

export default function CryptoPriceBlock() {
    const [prices, setPrices] = useState<Prices>({})

    useEffect(() => {
        const fetchPrices = async () => {
            const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
            const data = await res.json()

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
        const interval = setInterval(fetchPrices, 300_000)
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
            {SYMBOLS.map(({ id, label, icon }) => {
                const value = prices[id]
                if (!value) return null
                return (
                    <div key={id} className="text-center min-w-[100px]">
                        <div className="flex items-center justify-center gap-1">
                            <span className="uppercase text-sm text-gray-400">{label}</span>
                            <img
                                src={`https://assets.coingecko.com/coins/images/${icon}/thumb.png`}
                                alt={label}
                                className="inline-block w-5 h-5 ml-1"
                                style={{ verticalAlign: 'middle' }}
                            />
                        </div>
                        <p className="text-xl font-bold">
                            ${value.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-sm ${value.usd_24h_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {value.usd_24h_change >= 0 ? '▲' : '▼'} {value.usd_24h_change.toFixed(2)}%
                        </p>
                    </div>
                )
            })}
        </div>
    )
}
