'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type TokenPrice = {
    price: number
    change24h: number
    source?: 'binance' | 'mexc'
}

type Prices = {
    [key: string]: TokenPrice
}

// Token mapping: Binance symbol -> display info
const BINANCE_TOKENS = {
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

// MEXC-only tokens (not available on Binance)
const MEXC_TOKENS = {
    'WAIUSDT': {
        name: 'wai',
        ticker: 'WAI',
        icon: '/icons/wai.png'
    }
}

export default function CryptoPriceBlock() {
    const [prices, setPrices] = useState<Prices>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchBinancePrices = async () => {
        const symbols = Object.keys(BINANCE_TOKENS)

        const pricePromises = symbols.map(async (symbol) => {
            const response = await fetch(
                `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
            )

            if (!response.ok) {
                throw new Error(`Failed to fetch ${symbol} from Binance`)
            }

            const data = await response.json()
            return {
                symbol,
                price: parseFloat(data.lastPrice),
                change24h: parseFloat(data.priceChangePercent),
                source: 'binance' as const
            }
        })

        return await Promise.all(pricePromises)
    }

    const fetchMEXCPrices = async () => {
        const symbols = Object.keys(MEXC_TOKENS)

        if (symbols.length === 0) return []

        const pricePromises = symbols.map(async (symbol) => {
            const response = await fetch(
                `https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`
            )

            if (!response.ok) {
                throw new Error(`Failed to fetch ${symbol} from MEXC`)
            }

            const data = await response.json()
            return {
                symbol,
                price: parseFloat(data.lastPrice),
                change24h: parseFloat(data.priceChangePercent),
                source: 'mexc' as const
            }
        })

        return await Promise.all(pricePromises)
    }

    const fetchAllPrices = async () => {
        try {
            setError(null)

            // Fetch from both sources in parallel
            const [binanceResults, mexcResults] = await Promise.all([
                fetchBinancePrices().catch(err => {
                    console.warn('Binance fetch failed:', err)
                    return []
                }),
                fetchMEXCPrices().catch(err => {
                    console.warn('MEXC fetch failed:', err)
                    return []
                })
            ])

            // Transform results into our expected format
            const newPrices: Prices = {}

            // Process Binance results
            binanceResults.forEach(({ symbol, price, change24h, source }) => {
                const config = BINANCE_TOKENS[symbol as keyof typeof BINANCE_TOKENS]
                if (config) {
                    newPrices[config.name] = {
                        price,
                        change24h,
                        source
                    }
                }
            })

            // Process MEXC results
            mexcResults.forEach(({ symbol, price, change24h, source }) => {
                const config = MEXC_TOKENS[symbol as keyof typeof MEXC_TOKENS]
                if (config) {
                    newPrices[config.name] = {
                        price,
                        change24h,
                        source
                    }
                }
            })

            setPrices(newPrices)

        } catch (error) {
            console.error('Error fetching prices:', error)
            setError('Failed to fetch prices')

            // Fallback to dummy data for development
            setPrices({
                bitcoin: { price: 67500, change24h: 2.45, source: 'binance' },
                ethereum: { price: 3420, change24h: -1.23, source: 'binance' },
                solana: { price: 145, change24h: 3.67, source: 'binance' },
                xrp: { price: 0.56, change24h: -0.89, source: 'binance' },
                dogecoin: { price: 0.085, change24h: 1.45, source: 'binance' },
                wai: { price: 0.25, change24h: 0.00, source: 'mexc' }
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAllPrices()

        // Refresh every 30 seconds
        const interval = setInterval(fetchAllPrices, 30_000)

        return () => clearInterval(interval)
    }, [])

    // Helper function to get token config by name
    const getTokenConfig = (tokenName: string) => {
        // Check Binance tokens first
        const binanceConfig = Object.values(BINANCE_TOKENS).find(config => config.name === tokenName)
        if (binanceConfig) return binanceConfig

        // Check MEXC tokens
        return Object.values(MEXC_TOKENS).find(config => config.name === tokenName)
    }

    // Helper function to format price
    const formatPrice = (price: number): string => {
        if (price < 0.01) {
            return price.toFixed(6)
        } else if (price < 1) {
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
                        onClick={fetchAllPrices}
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
                                    {/* Use regular img tag for BNB to avoid Next.js optimization issues */}
                                    {config.ticker === 'BNB' ? (
                                        <img
                                            src={config.icon}
                                            alt={`${config.ticker} icon`}
                                            className="w-8 h-8 object-contain"
                                            onLoad={() => console.log(`✅ ${config.ticker} icon loaded successfully`)}
                                            onError={(e) => {
                                                console.error(`❌ ${config.ticker} icon failed to load:`, config.icon)
                                                const target = e.target as HTMLImageElement
                                                target.style.display = 'none'
                                                target.parentElement?.insertAdjacentHTML(
                                                    'afterbegin',
                                                    `<div class="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">${config.ticker}</div>`
                                                )
                                            }}
                                        />
                                    ) : (
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
                                    )}
                                </div>
                            </div>

                            {/* Token Symbol */}
                            <p className="uppercase text-sm text-gray-400 font-medium">
                                {config.ticker}
                                {/* Optional: Show source indicator */}
                                {data.source && (
                                    <span className="ml-1 text-xs opacity-60">
                                        ({data.source === 'binance' ? 'B' : 'M'})
                                    </span>
                                )}
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
                    Data from Binance & MEXC • Updated every 30s
                </p>
            </div>
        </div>
    )
}