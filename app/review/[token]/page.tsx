"use client";

import { useClientDomainDetection } from "@/lib/clientDomainDetection";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import StarRating from "@/app/components/StarRating";
import { getServiceDisplayName } from "@/lib/serviceTypes";

interface ReviewData {
    id: number;
    bookingId: number;
    alreadySubmitted: boolean;
    existingRating: number | null;
    existingText: string | null;
    serviceType: string;
    serviceDate: string;
    serviceNote: string | null;
    ownerName: string;
    dogNames: string[];
    dogImages: string[];
}

export default function ReviewPage() {
    const params = useParams();
    const token = params.token as string;
    const domain = useClientDomainDetection();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [reviewData, setReviewData] = useState<ReviewData | null>(null);

    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState("");

    // Redirect if not on hunters-hounds domain  
    useEffect(() => {
        if (domain !== 'hunters-hounds') {
            window.location.href = `https://hunters-hounds.london/review/${token}`;
        }
    }, [domain, token]);
    
    useEffect(() => {
        const fetchReviewData = async () => {
            try {
                const response = await fetch(`/api/dog-walking/reviews/submit?token=${token}`);
                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || "Failed to load review");
                    return;
                }

                setReviewData(data.review);

                if (data.review.alreadySubmitted) {
                    setSubmitted(true);
                    setRating(data.review.existingRating || 0);
                    setReviewText(data.review.existingText || "");
                }
            } catch (err) {
                setError("Failed to load review data");
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchReviewData();
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            setError("Please select a star rating");
            return;
        }

        if (reviewText.trim().length < 10) {
            setError("Please write at least a few words about your experience");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/reviews/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    rating,
                    review_text: reviewText
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to submit review");
                return;
            }

            setSubmitted(true);
        } catch (err) {
            setError("Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatServiceDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "EEEE, MMMM d, yyyy");
        } catch {
            return dateString;
        }
    };

    const dogNamesText = reviewData?.dogNames.join(" & ") || "your dog";

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    if (error && !reviewData) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md text-center">
                    <div className="text-red-400 text-xl mb-4">{error}</div>
                    <p className="text-gray-400">
                        This review link may have expired or is invalid.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-lg text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
                            <svg
                                className="w-10 h-10 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-white">
                        Thank You!
                    </h1>

                    <p className="text-gray-300 text-lg">
                        Your review has been submitted. I really appreciate you taking
                        the time to share your experience with {dogNamesText}!
                    </p>

                    <div className="flex justify-center">
                        <StarRating rating={rating} readonly size="lg" />
                    </div>

                    {reviewText && (
                        <div className="bg-gray-800 rounded-lg p-4 text-gray-300 italic">
                            "{reviewText}"
                        </div>
                    )}

                    <a
                        href="https://hunters-hounds.london"
                        className="inline-block mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Visit Hunter's Hounds
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-white">
                        Leave a Review
                    </h1>
                    <p className="text-gray-400">
                        How was {dogNamesText}'s experience?
                    </p>
                </div>

                {/* Dog Image */}
                {reviewData?.dogImages && reviewData.dogImages.length > 0 && (
                    <div className="flex justify-center gap-4">
                        {reviewData.dogImages.map((img, idx) => (
                            <div
                                key={idx}
                                className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500"
                            >
                                <img
                                    src={`/images/dogs/${img}`}
                                    alt={reviewData.dogNames[idx] || "Dog"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Booking Details */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Service:</span>
                            <span className="text-white font-medium">{reviewData?.serviceType ? getServiceDisplayName(reviewData.serviceType) : ''}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Date:</span>
                            <span className="text-white">
                                {reviewData?.serviceDate && formatServiceDate(reviewData.serviceDate)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Dog{reviewData?.dogNames && reviewData.dogNames.length > 1 ? 's' : ''}:</span>
                            <span className="text-white">{dogNamesText}</span>
                        </div>
                    </div>
                </div>

                {/* Review Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Star Rating */}
                    <div className="text-center space-y-3">
                        <label className="block text-gray-300 font-medium">
                            Your Rating
                        </label>
                        <div className="flex justify-center">
                            <StarRating
                                rating={rating}
                                onRatingChange={setRating}
                                size="lg"
                            />
                        </div>
                        {rating > 0 && (
                            <p className="text-yellow-400 text-sm">
                                {rating === 5 && "Excellent!"}
                                {rating === 4 && "Great!"}
                                {rating === 3 && "Good"}
                                {rating === 2 && "Fair"}
                                {rating === 1 && "Poor"}
                            </p>
                        )}
                    </div>

                    {/* Review Text */}
                    <div className="space-y-2">
                        <label htmlFor="review" className="block text-gray-300 font-medium">
                            Your Review
                        </label>
                        <textarea
                            id="review"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder={`Tell us about ${dogNamesText}'s experience...`}
                            rows={4}
                            maxLength={2000}
                            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                        />
                        <p className="text-gray-500 text-xs text-right">
                            {reviewText.length}/2000
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || rating === 0}
                        className={`
                            w-full p-4 rounded-lg font-semibold text-white transition-colors
                            ${submitting || rating === 0
                                ? "bg-gray-700 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                            }
                        `}
                    >
                        {submitting ? "Submitting..." : "Submit Review"}
                    </button>
                </form>

                {/* Footer */}
                <div className="text-center pt-4 border-t border-gray-700">
                    <p className="text-gray-500 text-sm">
                        Hunter's Hounds - Professional Dog Walking
                    </p>
                </div>
            </div>
        </div>
    );
}
