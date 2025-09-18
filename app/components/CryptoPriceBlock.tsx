'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { createChart, ColorType, IChartApi, CandlestickData, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts'

type TokenPrice = {
    price: number
    change24h: number
    source?: 'binance' | 'mexc'
}

type Prices = {
    [key: string]: TokenPrice
}

type OHLCV = {
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
}

type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

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

// Timeframe configurations
const TIMEFRAMES: { [key in TimeFrame]: { label: string; interval: string; limit: number } } = {
    '1m': { label: '1m', interval: '1m', limit: 1440 }, // 24h of 1m candles
    '5m': { label: '5m', interval: '5m', limit: 288 },  // 24h of 5m candles
    '15m': { label: '15m', interval: '15m', limit: 96 }, // 24h of 15m candles
    '1h': { label: '1h', interval: '1h', limit: 168 },   // 7 days of 1h candles
    '4h': { label: '4h', interval: '4h', limit: 168 },   // 4 weeks of 4h candles
    '1d': { label: '1d', interval: '1d', limit: 365 }    // 1 year of daily candles
}

// Helper function to determine price format based on price level
const getPriceFormat = (averagePrice: number) => {
    if (averagePrice < 1) {
        // For tokens below $1, show 6 decimal places (2 extra)
        return {
            type: 'price' as const,
            precision: 6,
            minMove: 0.000001
        }
    } else if (averagePrice < 10) {
        // For tokens $1-$10, show 4 decimal places
        return {
            type: 'price' as const,
            precision: 4,
            minMove: 0.0001
        }
    } else if (averagePrice < 100) {
        // For tokens $10-$100, show 2 decimal places
        return {
            type: 'price' as const,
            precision: 2,
            minMove: 0.01
        }
    } else {
        // For tokens above $100, show 2 decimal places
        return {
            type: 'price' as const,
            precision: 2,
            minMove: 0.01
        }
    }
}

// Chart Modal Component
function ChartModal({
    isOpen,
    onClose,
    tokenConfig,
    tokenData
}: {
    isOpen: boolean
    onClose: () => void
    tokenConfig: any
    tokenData: TokenPrice
}) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const [timeframe, setTimeframe] = useState<TimeFrame>('15m')
    const [chartData, setChartData] = useState<OHLCV[]>([])
    const [loading, setLoading] = useState(false)

    // Get symbol for API calls
    const getSymbol = () => {
        const binanceSymbol = Object.entries(BINANCE_TOKENS).find(([_, config]) =>
            config.name === tokenConfig.name
        )?.[0]

        const mexcSymbol = Object.entries(MEXC_TOKENS).find(([_, config]) =>
            config.name === tokenConfig.name
        )?.[0]

        return binanceSymbol || mexcSymbol || ''
    }

    // Fetch chart data
    const fetchChartData = useCallback(async (tf: TimeFrame) => {
        setLoading(true)
        try {
            const symbol = getSymbol()
            if (!symbol) return

            const { interval, limit } = TIMEFRAMES[tf]

            // Determine API endpoint based on token source
            const isBinanceToken = Object.keys(BINANCE_TOKENS).includes(symbol)
            const apiUrl = isBinanceToken
                ? `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
                : `/api/mexc?symbol=${symbol}&endpoint=klines&interval=${interval}&limit=${limit}`

            const response = await fetch(apiUrl)
            if (!response.ok) throw new Error('Failed to fetch chart data')

            const data = await response.json()

            // Transform to OHLCV format
            const ohlcvData: OHLCV[] = data.map((candle: any[]) => ({
                time: Math.floor(candle[0] / 1000), // Convert to seconds
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
            }))

            setChartData(ohlcvData)
        } catch (error) {
            console.error('Error fetching chart data:', error)
        } finally {
            setLoading(false)
        }
    }, [tokenConfig])

    // Initialize chart
    useEffect(() => {
        if (!isOpen || !chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500, // Increased height for volume
            layout: {
                background: { type: ColorType.Solid, color: '#1f2937' },
                textColor: '#d1d5db',
            },
            grid: {
                vertLines: { color: '#374151' },
                horzLines: { color: '#374151' },
            },
            crosshair: {
                mode: 1,
            },
            rightPriceScale: {
                borderColor: '#4b5563',
            },
            timeScale: {
                borderColor: '#4b5563',
                timeVisible: true,
                secondsVisible: false,
            },
        })

        chartRef.current = chart

        // Calculate average price for formatting
        const averagePrice = chartData.length > 0
            ? chartData.reduce((sum, candle) => sum + candle.close, 0) / chartData.length
            : tokenData.price

        // Get appropriate price format
        const priceFormat = getPriceFormat(averagePrice)

        // Add candlestick series with dynamic price formatting
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
            priceFormat: priceFormat
        })

        // Configure main price scale margins (top 65% with padding)
        candlestickSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.1,    // 10% padding at top
                bottom: 0.4, // 40% space for volume + gap
            },
        })

        // Add volume histogram series
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: 'volume',
        } as any)

        // Configure volume scale margins (bottom 25% with padding)
        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.75,   // Start at 75% down (25% for volume)
                bottom: 0.05, // 5% padding at bottom
            },
        })

        // Set chart data with proper typing
        if (chartData.length > 0) {
            const candlestickData: CandlestickData[] = chartData.map(d => ({
                time: d.time as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            }))
            candlestickSeries.setData(candlestickData)

            // Volume data - color bars based on price direction
            const volumeData = chartData.map((d, index) => {
                const prevClose = index > 0 ? chartData[index - 1].close : d.open
                const isUp = d.close >= prevClose
                return {
                    time: d.time as Time,
                    value: d.volume,
                    color: isUp ? '#10b981' : '#ef4444' // Green for up, red for down
                }
            })
            volumeSeries.setData(volumeData)

            // Create tooltip element
            if (!tooltipRef.current && chartContainerRef.current) {
                const tooltip = document.createElement('div')
                tooltip.style.cssText = `
                    position: absolute;
                    display: none;
                    padding: 8px 12px;
                    background: rgba(17, 24, 39, 0.95);
                    border: 1px solid #374151;
                    border-radius: 6px;
                    color: white;
                    font-size: 12px;
                    font-family: monospace;
                    pointer-events: none;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                `
                chartContainerRef.current.appendChild(tooltip)
                tooltipRef.current = tooltip
            }

            // Helper function to format price in tooltip based on token price level
            const formatTooltipPrice = (price: number) => {
                if (averagePrice < 1) {
                    return price.toFixed(6)
                } else if (averagePrice < 10) {
                    return price.toFixed(4)
                } else {
                    return price.toFixed(2)
                }
            }

            // Subscribe to crosshair move for tooltip
            chart.subscribeCrosshairMove((param: any) => {
                if (!tooltipRef.current || !chartContainerRef.current) return

                if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
                    tooltipRef.current.style.display = 'none'
                    return
                }

                // Get data for current time
                const candleData = param.seriesData.get(candlestickSeries)
                const volumeData = param.seriesData.get(volumeSeries)

                if (!candleData && !volumeData) {
                    tooltipRef.current.style.display = 'none'
                    return
                }

                // Format the tooltip content
                let tooltipContent = ''

                if (candleData) {
                    const change = candleData.close - candleData.open
                    const changePercent = (change / candleData.open) * 100
                    const changeColor = change >= 0 ? '#10b981' : '#ef4444'

                    tooltipContent += `
                        <div style="margin-bottom: 8px; font-weight: bold; color: #f3f4f6;">
                            ${new Date(param.time * 1000).toLocaleString()}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <div style="color: #9ca3af;">Open:</div>
                                <div style="color: #f3f4f6;">$${formatTooltipPrice(candleData.open)}</div>
                            </div>
                            <div>
                                <div style="color: #9ca3af;">High:</div>
                                <div style="color: #f3f4f6;">$${formatTooltipPrice(candleData.high)}</div>
                            </div>
                            <div>
                                <div style="color: #9ca3af;">Low:</div>
                                <div style="color: #f3f4f6;">$${formatTooltipPrice(candleData.low)}</div>
                            </div>
                            <div>
                                <div style="color: #9ca3af;">Close:</div>
                                <div style="color: #f3f4f6;">$${formatTooltipPrice(candleData.close)}</div>
                            </div>
                        </div>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
                            <div style="color: ${changeColor};">
                                ${change >= 0 ? '+' : ''}${formatTooltipPrice(change)} (${changePercent.toFixed(2)}%)
                            </div>
                        </div>
                    `
                }

                if (volumeData) {
                    tooltipContent += `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
                            <div style="color: #9ca3af;">Volume:</div>
                            <div style="color: #f3f4f6;">${volumeData.value.toLocaleString()}</div>
                        </div>
                    `
                }

                tooltipRef.current.innerHTML = tooltipContent
                tooltipRef.current.style.display = 'block'

                // Position tooltip
                const containerRect = chartContainerRef.current.getBoundingClientRect()
                const tooltipRect = tooltipRef.current.getBoundingClientRect()

                let left = param.point.x + 15
                let top = param.point.y - 10

                // Keep tooltip within container bounds
                if (left + tooltipRect.width > containerRect.width) {
                    left = param.point.x - tooltipRect.width - 15
                }
                if (top < 0) {
                    top = 10
                }
                if (top + tooltipRect.height > containerRect.height) {
                    top = containerRect.height - tooltipRect.height - 10
                }

                tooltipRef.current.style.left = left + 'px'
                tooltipRef.current.style.top = top + 'px'
            })
        }

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth
                })
            }
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
            chartRef.current = null
        }
    }, [isOpen, chartData, tokenConfig, tokenData])

    // Fetch data when timeframe changes
    useEffect(() => {
        if (isOpen) {
            fetchChartData(timeframe)
        }
    }, [isOpen, timeframe, tokenConfig, fetchChartData])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <img
                            src={tokenConfig.icon}
                            alt={tokenConfig.ticker}
                            className="w-8 h-8"
                        />
                        <div>
                            <h3 className="text-xl font-bold text-white">{tokenConfig.ticker}</h3>
                            <p className="text-gray-400 text-sm">
                                ${tokenData.price.toLocaleString()}
                                <span className={`ml-2 ${tokenData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {tokenData.change24h >= 0 ? '+' : ''}{tokenData.change24h.toFixed(2)}%
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-900 text-whitetext-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Timeframe Selector */}
                <div className="flex gap-2 p-4 border-b border-gray-700">
                    {Object.entries(TIMEFRAMES).map(([tf, config]) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf as TimeFrame)}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === tf
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-600 text-gray-600 text-gray-600 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {config.label}
                        </button>
                    ))}
                </div>

                {/* Chart Container */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-[500px]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                            <span className="ml-2 text-gray-400">Loading chart...</span>
                        </div>
                    ) : (
                        <div ref={chartContainerRef} className="w-full h-[500px]" />
                    )}
                </div>
            </div>
        </div>
    )
}

export default function CryptoPriceBlock() {
    const [prices, setPrices] = useState<Prices>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedToken, setSelectedToken] = useState<{ config: any, data: TokenPrice } | null>(null)

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
                `/api/mexc?symbol=${symbol}&endpoint=ticker/24hr`
            )

            if (!response.ok) {
                throw new Error(`Failed to fetch ${symbol} from MEXC`)
            }

            const data = await response.json()
            return {
                symbol,
                price: parseFloat(data.lastPrice),
                change24h: parseFloat(data.priceChangePercent) * 100,
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

    // Handle token click
    const handleTokenClick = (tokenName: string, data: TokenPrice) => {
        const config = getTokenConfig(tokenName)
        if (config) {
            setSelectedToken({ config, data })
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
        <>
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
                            <div
                                key={tokenName}
                                className="text-center min-w-[100px] cursor-pointer hover:bg-gray-800 rounded-lg p-2 transition-colors"
                                onClick={() => handleTokenClick(tokenName, data)}
                            >
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
                                                        `<div class="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 text-gray-600 text-gray-300">${config.ticker}</div>`
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
                                                        `<div class="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 text-gray-600 text-gray-300">${config.ticker}</div>`
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
                        Data from Binance & MEXC • Updated every 30s • Click tokens for charts
                    </p>
                </div>
            </div>

            {/* Chart Modal */}
            {selectedToken && (
                <ChartModal
                    isOpen={!!selectedToken}
                    onClose={() => setSelectedToken(null)}
                    tokenConfig={selectedToken.config}
                    tokenData={selectedToken.data}
                />
            )}
        </>
    )
}