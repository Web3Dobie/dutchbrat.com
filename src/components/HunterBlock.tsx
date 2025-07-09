import Image from 'next/image'
import React from 'react' // ✅ This is required for some setups using JSX (optional in Next 13+, but safe to include)

export default function HunterBlock() {
    return (
        <section className="mt-20 flex flex-col md:flex-row items-center gap-8 border-t border-gray-800 pt-10">
            <Image
                src="/images/hunter_with_ball.png"
                alt="Hunter the Web3Dobie"
                width={220}
                height={220}
                className="rounded-xl border-4 border-emerald-500 shadow-lg"
            />
            <div className="text-lg max-w-xl">
                <p className="mb-4">
                    Hunter is my trusted Web3 Doberman — part analyst, part watchdog. He helps sniff out alpha,
                    barks at scams, and keeps this site running with daily insights on X, commentary, and briefings.
                    Follow his instincts. They’re usually right.
                </p>
                <a
                    href="https://x.com/Web3Dobie"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-emerald-400 font-semibold hover:underline"
                >
                    → Follow @Web3_Dobie on X 🐾
                </a>
                </div>
        </section>
    )
}

