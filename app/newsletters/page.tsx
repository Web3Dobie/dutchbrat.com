"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";

interface Newsletter {
    id: number;
    title: string;
    content: { month?: string };
    sent_at: string;
}

export default function NewslettersPage() {
    const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/dog-walking/newsletter")
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setNewsletters(data.newsletters);
                } else {
                    setError("Failed to load newsletters");
                }
            })
            .catch(() => setError("Failed to load newsletters"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            {/* Header */}
            <section className="py-16 bg-black/20">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                        Pack Newsletter
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Monthly updates from Hunter's Hounds — new pack members, walk highlights, and seasonal tips.
                    </p>
                </div>
            </section>

            {/* Newsletter Cards */}
            <section className="py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto">
                        {loading && (
                            <div className="text-center py-12 text-gray-400 text-lg">
                                Loading newsletters...
                            </div>
                        )}

                        {error && (
                            <div className="text-center py-12 text-red-400 text-lg">{error}</div>
                        )}

                        {!loading && !error && newsletters.length === 0 && (
                            <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                                <p className="text-gray-400 text-lg">No newsletters published yet.</p>
                            </div>
                        )}

                        {!loading && !error && newsletters.length > 0 && (
                            <div className="space-y-4">
                                {newsletters.map(nl => (
                                    <Link
                                        key={nl.id}
                                        href={`/newsletters/${nl.id}`}
                                        className="block bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700 hover:border-blue-500 rounded-xl p-6 transition-all duration-200 group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                    {nl.title}
                                                </h2>
                                                {nl.content?.month && (
                                                    <p className="text-gray-400 mt-1">{nl.content.month}</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="text-gray-400 text-sm">
                                                    {format(new Date(nl.sent_at), "d MMM yyyy")}
                                                </p>
                                                <span className="text-blue-400 text-sm font-medium group-hover:underline">
                                                    Read →
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer Note */}
            <section className="py-8 border-t border-gray-700 mt-8">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-gray-500 text-sm">
                        Hunter's Hounds — Professional Dog Walking in Highbury Fields & Clissold Park
                    </p>
                </div>
            </section>
        </div>
    );
}
