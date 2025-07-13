'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import HunterSmiling from '../../public/images/hunter_smiling.png'

type Article = {
    id: string;         // Add this!
    headline: string;
    summary: string;
    image: string;
    file: string;
    date: string;
}

type Tweet = {
    id: string;
    text: string;
    created_at: string;
    url: string;
};

export default function HunterBlock() {
    const [article, setArticle] = useState<Article | null>(null)
    const [tweet, setTweet] = useState<Tweet | null>(null);

    useEffect(() => {
        // Fetch articles
        const fetchArticles = async () => {
            const res = await fetch('/api/articles');
            const all: Article[] = await res.json();
            const sorted = all.sort((a, b) =>
                new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
            setArticle(sorted[0]);
        };

        // Fetch latest tweet
        const fetchTweet = async () => {
            const res = await fetch('/api/latest-tweet');
            if (res.ok) {
                const tweet: Tweet = await res.json();
                setTweet(tweet);
            }
        };

        fetchArticles();
        fetchTweet();
    }, []);

    return (
        <div className="mt-8">
            {/* Latest Article Card */}
            {article && (
                <div className="mb-6 p-4 border border-gray-700 rounded-xl bg-gray-900">
                    <p className="text-sm text-gray-400 mb-2">Latest Article</p>
                    <Link
                        href={`/articles?articleId=${article.id}`}
                        className="text-xl font-semibold text-white hover:underline"
                    >
                        {article.headline}
                    </Link>
                    <p className="mt-1 text-gray-300">{article.summary}</p>
                </div>
            )}

            {/* Latest Tweet Card */}
            {tweet && (
                <div className="p-4 border border-blue-700 rounded-xl bg-gray-900">
                    <p className="text-sm text-blue-400 mb-2">Latest Tweet</p>
                    <p className="text-base text-white mb-2">{tweet.text}</p>
                    <Link
                        href={tweet.url}
                        target="_blank"   // open in new tab
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                    >
                        View on X (Twitter)
                    </Link>
                </div>
            )}
        </div>
    );
}
