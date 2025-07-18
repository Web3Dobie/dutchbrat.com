import Image from 'next/image';
import React from 'react';
import DutchBrat from '../../public/images/dutchbrat.jpg'; // ✅ correct import

export default function HeroIntro() {
    return (
        <section className="mt-10 flex flex-col md:flex-row items-center gap-8">
            <Image
                src={DutchBrat} // ✅ use the imported image
                alt="DutchBrat"
                width={200}
                height={200}
                className="rounded-full border-4 border-purple-600 shadow-lg"
            />
            <div>
                <h1 className="text-4xl font-bold mb-3">Welcome to DutchBrat</h1>
                <p className="text-lg max-w-xl">
                    I'm a hedge fund guy and crypto enthousiast 🧠📉📈. After 20+ years in traditional finance,
                    and being an early crypto adopter since 2010, I'm fully straddling TradFi & DeFi. 
                    DutchBrat.com is my Web3 venture, where I break down markets, publish my briefings,
                    and share what Hunter and I are tracking across the crypto landscape.
                </p>
            </div>
        </section>
    );
}


