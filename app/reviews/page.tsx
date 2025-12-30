"use client";

import { useClientDomainDetection } from "@/lib/clientDomainDetection";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import ReviewCard from "@/app/components/ReviewCard";
import StarRating from "@/app/components/StarRating";

interface Review {
    id: number;
    rating: number;
    reviewText: string;
    submittedAt: string;
    adminResponse: string | null;
    adminResponseDate: string | null;
    serviceType: string;
    serviceDate: string;
    serviceNote: string | null;
    customerFirstName: string;
    dogNames: string[];
    dogImages: string[];
}

export default function ReviewsPage() {
    const domain = useClientDomainDetection();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);

    // Redirect if not on hunters-hounds domain
    useEffect(() => {
        if (domain !== 'hunters-hounds') {
            window.location.href = 'https://hunters-hounds.london/reviews';
        }
    }, [domain]);
    
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const response = await fetch("/api/dog-walking/reviews/public");
                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || "Failed to load reviews");
                    return;
                }

                setReviews(data.reviews);
                setAverageRating(data.averageRating);
                setTotalReviews(data.total);
            } catch (err) {
                setError("Failed to load reviews");
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            {/* Header */}
            <section className="py-16 bg-black/20">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                        Customer Reviews
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                        See what our happy customers and their furry friends have to say about Hunter's Hounds.
                    </p>

                    {/* Rating Summary */}
                    {!loading && totalReviews > 0 && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-3">
                                <StarRating rating={Math.round(averageRating)} readonly size="lg" />
                                <span className="text-3xl font-bold text-yellow-400">
                                    {averageRating.toFixed(1)}
                                </span>
                            </div>
                            <p className="text-gray-400">
                                Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Reviews Grid */}
            <section className="py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        {loading && (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-lg">Loading reviews...</div>
                            </div>
                        )}

                        {error && (
                            <div className="text-center py-12">
                                <div className="text-red-400 text-lg">{error}</div>
                            </div>
                        )}

                        {!loading && !error && reviews.length === 0 && (
                            <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                                <p className="text-gray-400 text-lg mb-4">
                                    No reviews yet - be the first to share your experience!
                                </p>
                                <Link
                                    href="/book-now"
                                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Book a Service
                                </Link>
                            </div>
                        )}

                        {!loading && !error && reviews.length > 0 && (
                            <div className="space-y-6">
                                {reviews.map((review) => (
                                    <ReviewCard
                                        key={review.id}
                                        rating={review.rating}
                                        reviewText={review.reviewText}
                                        serviceType={review.serviceType}
                                        serviceDate={review.serviceDate}
                                        serviceNote={review.serviceNote}
                                        customerFirstName={review.customerFirstName}
                                        dogNames={review.dogNames}
                                        dogImages={review.dogImages}
                                        adminResponse={review.adminResponse}
                                        adminResponseDate={review.adminResponseDate}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-12 bg-black/20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-2xl font-bold mb-4">Ready to Join Our Happy Pack?</h2>
                    <p className="text-gray-300 mb-6 max-w-xl mx-auto">
                        Book a free Meet & Greet and see why our customers love Hunter's Hounds.
                    </p>
                    <Link
                        href="/book-now"
                        className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg"
                    >
                        Book Now
                    </Link>
                </div>
            </section>

            {/* Footer Note */}
            <section className="py-8 border-t border-gray-700">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-gray-500 text-sm">
                        Hunter's Hounds - Professional Dog Walking in Highbury Fields & Clissold Park
                    </p>
                </div>
            </section>
        </div>
    );
}
