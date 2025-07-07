import Image from 'next/image'

export default function HunterBlock() {
    return (
        <section className="mt-20 flex flex-col md:flex-row items-center gap-8 border-t border-gray-800 pt-10">
            <Image
                src="/images/Hunter smiling.png"
                alt="Hunter the Web3Dobie"
                width={220}
                height={220}
                className="rounded-xl border-4 border-emerald-500 shadow-lg"
            />
            <div>
                <h2 className="text-3xl font-semibold mb-3">Meet Hunter 🐾</h2>
                <p className="text-lg max-w-xl">
                    Hunter is my trusted Web3 Doberman — part analyst, part watchdog. He helps sniff out alpha,
                    bark at scams, and keep this site running with daily insights, commentary, and briefings.
                    Follow his instincts. They’re usually right.
                </p>
            </div>
        </section>
    )
}

