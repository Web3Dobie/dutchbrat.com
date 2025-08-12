'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type TokenPrice = {
    price: number
    change24h: number
}

type Prices = {
    [key: string]: TokenPrice
}

// Token mapping: Binance symbol -> display info
const TOKEN_CONFIG = {
    'BTCUSDT': {
        name: 'bitcoin',
        ticker: 'BTC',
        icon: '/icons/btc.png'
    },
    'ETHUSDT': {
        name: 'ethereum',
        ticker: 'ETH',
        icon: '/icons/eth.png'
    },
    'SOLUSDT': {
        name: 'solana',
        ticker: 'SOL',
        icon: '/icons/sol.png'
    },
    'XRPUSDT': {
        name: 'xrp',
        ticker: 'XRP',
        icon: '/icons/xrp.png'
    },
    'DOGEUSDT': {
        name: 'dogecoin',
        ticker: 'DOGE',
        icon: '/icons/doge.png'
    },
    'BNBUSDT': {
        name: 'BNB',
        ticker: 'BNB',
        icon: '/icons/bnb.png'
    }
}

export default function CryptoPriceBlock() {
    const [prices, setPrices] = useState<Prices>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchBinancePrices = async () => {
        try {
            setError(null)

            // Get symbols from our config
            const symbols = Object.keys(TOKEN_CONFIG)

            // Fetch current prices from Binance
            const pricePromises = symbols.map(async (symbol) => {
                const response = await fetch(
                    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
                )

                if (!response.ok) {
                    throw new Error(`Failed to fetch ${symbol}`)
                }

                const data = await response.json()
                return {
                    symbol,
                    price: parseFloat(data.lastPrice),
                    change24h: parseFloat(data.priceChangePercent)
                }
            })

            const results = await Promise.all(pricePromises)

            // Transform results into our expected format
            const newPrices: Prices = {}
            results.forEach(({ symbol, price, change24h }) => {
                const config = TOKEN_CONFIG[symbol as keyof typeof TOKEN_CONFIG]
                if (config) {
                    newPrices[config.name] = {
                        price,
                        change24h
                    }
                }
            })

            setPrices(newPrices)
            setLoading(false)

        } catch (error) {
            console.error('Error fetching Binance prices:', error)
            setError('Failed to fetch prices')
            setLoading(false)

            // Fallback to dummy data for development
            setPrices({
                bitcoin: { price: 67500, change24h: 2.45 },
                ethereum: { price: 3420, change24h: -1.23 },
                solana: { price: 145, change24h: 3.67 },
                xrp: { price: 0.56, change24h: -0.89 },
                dogecoin: { price: 0.085, change24h: 1.45 }
            })
        }
    }

    useEffect(() => {
        fetchBinancePrices()

        // Refresh every 30 seconds (more frequent than CoinGecko)
        const interval = setInterval(fetchBinancePrices, 30_000)

        return () => clearInterval(interval)
    }, [])

    // Helper function to get token config by name
    const getTokenConfig = (tokenName: string) => {
        return Object.values(TOKEN_CONFIG).find(config => config.name === tokenName)
    }

    // Helper function to format price
    const formatPrice = (price: number): string => {
        if (price < 1) {
            return price.toFixed(4)
        } else if (price < 100) {
            return price.toFixed(2)
        } else {
            return price.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            })
        }
    }

    if (loading) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-center items-center mb-10">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                    <span className="text-gray-400">Loading prices...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-10">
            {error && (
                <div className="text-center mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                    <button
                        onClick={fetchBinancePrices}
                        className="text-blue-400 hover:text-blue-300 text-sm underline mt-1"
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
                {Object.entries(prices).map(([tokenName, data]) => {
                    const config = getTokenConfig(tokenName)
                    if (!config) return null

                    return (
                        <div key={tokenName} className="text-center min-w-[100px]">
                            {/* Token Icon */}
                            <div className="flex justify-center mb-2">
                                <div className="relative w-8 h-8">
                                    <Image
                                        src={config.icon}
                                        alt={`${config.ticker} icon`}
                                        fill
                                        className="object-contain"
                                        onError={(e) => {
                                            // Fallback to text if icon fails to load
                                            const target = e.target as HTMLImageElement
                                            target.style.display = 'none'
                                            target.parentElement?.insertAdjacentHTML(
                                                'afterbegin',
                                                `<div class="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">${config.ticker}</div>`
                                            )
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Token Symbol */}
                            <p className="uppercase text-sm text-gray-400 font-medium">
                                {config.ticker}
                            </p>

                            {/* Price */}
                            <p className="text-xl font-bold text-white">
                                ${formatPrice(data.price)}
                            </p>

                            {/* 24h Change */}
                            <p className={`text-sm font-medium ${data.change24h >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                                }`}>
                                {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Data source indicator */}
            <div className="text-center mt-4">
                <p className="text-xs text-gray-500">
                    Data from Binance • Updated every 30s
                </p>
            </div>
        </div>
    )
}