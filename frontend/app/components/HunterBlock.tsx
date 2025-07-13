'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import HunterSmiling from '../../public/images/hunter_smiling.png'

type Article = {
    id: string;         // Add this!
    title: string;
    summary: string;
    image: string;
    file: string;
}

export default function HunterBlock() {
    const [article, setArticle] = useState<Article | null>(null)

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const res = await fetch('https://w3d-articles-server-gfdbe9aqfbd2gceu.swedencentral-01.azurewebsites.net/api/latest');
                const data = await res.json();
                console.log('Latest article from API:', data); // 👈 ADD THIS LINE
                setArticle(data);
            } catch (err) {
                console.error('Failed to fetch latest article:', err);
            }
        };

        fetchArticle();
    }, []);

    return (
        <section className="mt-20 flex flex-col md:flex-row items-center gap-8 border-t border-gray-800 pt-10">
            <Image
                src={HunterSmiling}
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
                    href="https://x.com/@Web3_Dobie"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-emerald-400 font-semibold hover:underline"
                >
                    → Follow @Web3_Dobie on X 🐾
                </a>

                {article && (
                    <div className="mt-6 p-4 border border-gray-700 rounded-xl bg-gray-900">
                        <p className="text-sm text-gray-400 mb-2">Latest Article</p>
                        {/* Use Next.js Link to /articles?articleId=... */}
                        <Link
                            href={`/articles?articleId=${article.id}`}
                            className="text-xl font-semibold text-white hover:underline"
                        >
                            {article.title}
                        </Link>
                        <p className="mt-1 text-gray-300">{article.summary}</p>
                    </div>
                )}
            </div>
        </section>
    )
}
