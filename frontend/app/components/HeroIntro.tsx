// frontend/app/components/HeroIntro.tsx
import Image from 'next/image';
import React from 'react';
import DutchBrat from '../../public/images/dutchbrat.jpg';
import LatestBriefingCard from './LatestBriefingCard';

export default function HeroIntro() {
    return (
        <section className="mt-10">
            {/* Main Hero Section */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                <Image
                    src={DutchBrat}
                    alt="DutchBrat"
                    width={200}
                    height={200}
                    className="rounded-full border-4 border-purple-600 shadow-lg"
                />
                <div className="flex-1">
                    <h1 className="text-4xl font-bold mb-3 text-white">Welcome to DutchBrat</h1>
                    <p className="text-lg max-w-xl text-gray-300">
                        I'm a hedge fund guy and crypto enthousiast 🧠📉📈. Having worked 30 years in traditional
                        finance, and being an early crypto adopter since 2010, I'm fully straddling TradFi & DeFi.
                        DutchBrat.com is my Web3 venture, where I break down markets, publish my briefings,
                        and share what Hunter and I are tracking across the crypto landscape.
                    </p>
                </div>
            </div>

            {/* Cards section - 3-card layout for HedgeFund content */}
            <div className="max-w-4xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <LatestBriefingCard />

                    <div className="p-4 border border-dashed border-gray-500 rounded-xl bg-gray-900/50">
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">Card 2</p>
                            <p className="text-gray-600 text-xs">Coming Soon</p>
                        </div>
                    </div>

                    <div className="p-4 border border-dashed border-gray-500 rounded-xl bg-gray-900/50">
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">Card 3</p>
                            <p className="text-gray-600 text-xs">Coming Soon</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}