"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useParams } from "next/navigation";

interface WelcomeBlock {
    type: "text" | "image";
    content: string;
    caption?: string;
}

interface PackMember {
    dogId: number;
    dogName: string;
    breed: string;
    ownerName: string;
    imageFilename: string | null;
    firstServiceDate: string;
}

interface NewsletterContent {
    title: string;
    month?: string;
    source?: "editor" | "notion";
    notionHtml?: string;
    welcomeMessage?: string;
    welcomeBlocks?: WelcomeBlock[];
    newPackMembers?: PackMember[];
    packFarewells?: string;
    walkHighlights?: { text: string; images: string[] };
    seasonalTips?: string;
    newFeatures?: string;
    includeNewPackMembers?: boolean;
}

interface Newsletter {
    id: number;
    title: string;
    content: NewsletterContent;
    sent_at: string;
}

export default function NewsletterDetailPage() {
    const { id } = useParams();
    const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/dog-walking/newsletter")
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const found = data.newsletters.find((n: Newsletter) => String(n.id) === String(id));
                    if (found) {
                        setNewsletter(found);
                    } else {
                        setError("Newsletter not found");
                    }
                } else {
                    setError("Failed to load newsletter");
                }
            })
            .catch(() => setError("Failed to load newsletter"))
            .finally(() => setLoading(false));
    }, [id]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            {/* Back link */}
            <div className="container mx-auto px-4 pt-8">
                <Link
                    href="/newsletters"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                    ← Back to newsletters
                </Link>
            </div>

            {loading && (
                <div className="text-center py-24 text-gray-400 text-lg">Loading...</div>
            )}

            {error && (
                <div className="text-center py-24 text-red-400 text-lg">{error}</div>
            )}

            {!loading && !error && newsletter && (
                <div className="container mx-auto px-4 py-8 max-w-3xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 mb-8 text-center">
                        <div className="text-4xl mb-3">🐕</div>
                        <h1 className="text-3xl font-bold text-white mb-2">{newsletter.title}</h1>
                        {newsletter.content.month && (
                            <p className="text-blue-200 text-lg">{newsletter.content.month} Newsletter</p>
                        )}
                        <p className="text-gray-400 text-sm mt-2">
                            Sent {format(new Date(newsletter.sent_at), "d MMMM yyyy")}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="bg-white rounded-2xl overflow-hidden">
                        {newsletter.content.source === "notion" && newsletter.content.notionHtml ? (
                            <div
                                className="p-8 text-gray-800 newsletter-content"
                                dangerouslySetInnerHTML={{ __html: newsletter.content.notionHtml }}
                            />
                        ) : (
                            <EditorContent content={newsletter.content} />
                        )}

                        {/* New Pack Members */}
                        {newsletter.content.includeNewPackMembers !== false &&
                            newsletter.content.newPackMembers &&
                            newsletter.content.newPackMembers.length > 0 && (
                                <div className="p-8 bg-blue-50 border-t border-blue-100">
                                    <h2 className="text-xl font-bold text-blue-900 mb-4">🐾 Welcome to the Pack!</h2>
                                    <p className="text-gray-600 mb-6">
                                        We're excited to welcome{" "}
                                        {newsletter.content.newPackMembers.length === 1
                                            ? "a new member"
                                            : `${newsletter.content.newPackMembers.length} new members`}{" "}
                                        to Hunter's Hounds!
                                    </p>
                                    <div className="flex flex-wrap gap-6 justify-center">
                                        {newsletter.content.newPackMembers.map(dog => (
                                            <div key={dog.dogId} className="text-center w-40">
                                                {dog.imageFilename ? (
                                                    <img
                                                        src={`/api/dog-images/${dog.imageFilename}`}
                                                        alt={dog.dogName}
                                                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-400 mx-auto mb-2"
                                                    />
                                                ) : (
                                                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mx-auto mb-2 flex items-center justify-center text-4xl">
                                                        🐕
                                                    </div>
                                                )}
                                                <div className="font-semibold text-gray-800">{dog.dogName}</div>
                                                <div className="text-gray-500 text-sm">{dog.breed}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 pb-8 text-gray-500 text-sm">
                        <p>Hunter's Hounds — Professional Dog Walking & Pet Care</p>
                        <p>07932749772 · bookings@hunters-hounds.london</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function EditorContent({ content }: { content: NewsletterContent }) {
    return (
        <div className="p-8 text-gray-800 space-y-6">
            {/* Welcome */}
            {content.welcomeBlocks && content.welcomeBlocks.length > 0 ? (
                <div>
                    {content.welcomeBlocks.map((block, i) =>
                        block.type === "text" ? (
                            <p key={i} className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
                                {block.content}
                            </p>
                        ) : (
                            <figure key={i} className="my-4">
                                <img
                                    src={`/api/newsletter-images/${block.content}`}
                                    alt={block.caption || ""}
                                    className="rounded-lg max-w-full mx-auto"
                                />
                                {block.caption && (
                                    <figcaption className="text-center text-gray-500 text-sm mt-2">
                                        {block.caption}
                                    </figcaption>
                                )}
                            </figure>
                        )
                    )}
                </div>
            ) : content.welcomeMessage ? (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content.welcomeMessage}</p>
            ) : null}

            {/* Walk Highlights */}
            {content.walkHighlights?.text && (
                <div className="bg-green-50 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-green-800 mb-3">🌿 Walk Highlights</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content.walkHighlights.text}</p>
                    {content.walkHighlights.images?.map((img, i) => (
                        <img
                            key={i}
                            src={`/api/newsletter-images/${img}`}
                            alt="Walk highlight"
                            className="rounded-lg mt-4 max-w-full"
                        />
                    ))}
                </div>
            )}

            {/* Pack Farewells */}
            {content.packFarewells && (
                <div className="bg-amber-50 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-amber-800 mb-3">👋 Pack Farewells</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content.packFarewells}</p>
                </div>
            )}

            {/* Seasonal Tips */}
            {content.seasonalTips && (
                <div className="bg-purple-50 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-purple-800 mb-3">💡 Seasonal Tips</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content.seasonalTips}</p>
                </div>
            )}

            {/* New Features */}
            {content.newFeatures && (
                <div className="bg-blue-50 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-blue-800 mb-3">✨ What's New</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content.newFeatures}</p>
                </div>
            )}
        </div>
    );
}
