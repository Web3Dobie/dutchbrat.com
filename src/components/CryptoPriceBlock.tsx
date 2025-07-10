'use client'

import { useEffect, useState } from 'react'

type Prices = {
    [key: string]: {
        usd: number
        usd_24h_change: number
    }
}

export default function CryptoPriceBlock() {
    const [prices, setPrices] = useState<Prices>({})

    useEffect(() => {
        const fetchPrices = async () => {
            const res = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin,xrp&vs_currencies=usd&include_24hr_change=true'
            )
            const data = await res.json()
            console.log("Fetched prices:", data)
            // If xrp missing, add dummy for test
            if (!data.xrp) {
                data.xrp = { usd: 0.56, usd_24h_change: -0.12 }
                setPrices(data)
            }

            fetchPrices()
            const interval = setInterval(fetchPrices, 300_000) // Refresh every 5 min
            return () => clearInterval(interval)
        }, [])

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap justify-center gap-4 mb-10">
            {Object.entries(prices).map(([key, value]) => (
                <div key={key} className="text-center">
                    <p className="uppercase text-sm text-gray-400">{key}</p>
                    <p className="text-xl font-bold">${value.usd.toLocaleString()}</p>
                    <p
                        className={`text-sm ${value.usd_24h_change >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                    >
                        {value.usd_24h_change.toFixed(2)}%
                    </p>
                </div>
            ))}
        </div>
    )
}
