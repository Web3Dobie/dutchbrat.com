"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import StarRating from "@/app/components/StarRating";

interface Review {
    id: number;
    bookingId: number;
    rating: number;
    reviewText: string;
    submittedAt: string;
    adminResponse: string | null;
    adminResponseDate: string | null;
    serviceType: string;
    serviceDate: string;
    serviceNote: string | null;
    ownerName: string;
    ownerEmail: string;
    dogNames: string[];
}

export default function ManageReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "pending" | "responded">("all");
    const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
    const [responseText, setResponseText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, [filter]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/dog-walking/admin/reviews?filter=${filter}`);
            if (!response.ok) {
                throw new Error("Failed to fetch reviews");
            }
            const data = await response.json();
            setReviews(data.reviews);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStartEdit = (review: Review) => {
        setEditingReviewId(review.id);
        setResponseText(review.adminResponse || "");
    };

    const handleCancelEdit = () => {
        setEditingReviewId(null);
        setResponseText("");
    };

    const handleSubmitResponse = async (reviewId: number) => {
        if (!responseText.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch("/api/dog-walking/admin/reviews", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    review_id: reviewId,
                    admin_response: responseText
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to submit response");
            }

            // Refresh reviews
            await fetchReviews();
            setEditingReviewId(null);
            setResponseText("");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteResponse = async (reviewId: number) => {
        if (!confirm("Are you sure you want to remove your response?")) return;

        try {
            const response = await fetch(`/api/dog-walking/admin/reviews?review_id=${reviewId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Failed to remove response");
            }

            await fetchReviews();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "MMM d, yyyy");
        } catch {
            return dateString;
        }
    };

    const styles = {
        container: {
            maxWidth: "1000px",
            margin: "0 auto",
            padding: "24px",
        } as React.CSSProperties,
        header: {
            marginBottom: "24px",
        } as React.CSSProperties,
        title: {
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#facc15",
            marginBottom: "8px",
        } as React.CSSProperties,
        backLink: {
            color: "#9ca3af",
            textDecoration: "none",
            fontSize: "0.9rem",
        } as React.CSSProperties,
        filterBar: {
            display: "flex",
            gap: "12px",
            marginBottom: "24px",
        } as React.CSSProperties,
        filterButton: (active: boolean) => ({
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontWeight: "500",
            backgroundColor: active ? "#3b82f6" : "#374151",
            color: active ? "#fff" : "#9ca3af",
        } as React.CSSProperties),
        reviewCard: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
        } as React.CSSProperties,
        reviewHeader: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "12px",
        } as React.CSSProperties,
        customerInfo: {
            flex: 1,
        } as React.CSSProperties,
        customerName: {
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#fff",
            marginBottom: "4px",
        } as React.CSSProperties,
        serviceInfo: {
            color: "#9ca3af",
            fontSize: "0.85rem",
        } as React.CSSProperties,
        reviewText: {
            color: "#e5e7eb",
            lineHeight: "1.6",
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#374151",
            borderRadius: "6px",
        } as React.CSSProperties,
        adminResponseBox: {
            backgroundColor: "#065f46",
            border: "1px solid #10b981",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "12px",
        } as React.CSSProperties,
        adminResponseText: {
            color: "#d1fae5",
            fontSize: "0.95rem",
        } as React.CSSProperties,
        textarea: {
            width: "100%",
            padding: "12px",
            backgroundColor: "#374151",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "0.95rem",
            resize: "vertical" as const,
            minHeight: "80px",
        } as React.CSSProperties,
        buttonRow: {
            display: "flex",
            gap: "8px",
            marginTop: "12px",
        } as React.CSSProperties,
        button: (variant: "primary" | "secondary" | "danger") => ({
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontWeight: "500",
            backgroundColor: variant === "primary" ? "#3b82f6" : variant === "danger" ? "#dc2626" : "#4b5563",
            color: "#fff",
        } as React.CSSProperties),
        emptyState: {
            textAlign: "center" as const,
            padding: "48px",
            color: "#9ca3af",
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <Link href="/dog-walking/admin" style={styles.backLink}>
                    &larr; Back to Admin Dashboard
                </Link>
                <h1 style={styles.title}>Manage Reviews</h1>
            </div>

            {/* Filter Bar */}
            <div style={styles.filterBar}>
                <button
                    style={styles.filterButton(filter === "all")}
                    onClick={() => setFilter("all")}
                >
                    All Reviews
                </button>
                <button
                    style={styles.filterButton(filter === "pending")}
                    onClick={() => setFilter("pending")}
                >
                    Pending Response
                </button>
                <button
                    style={styles.filterButton(filter === "responded")}
                    onClick={() => setFilter("responded")}
                >
                    Responded
                </button>
            </div>

            {/* Loading State */}
            {loading && (
                <div style={styles.emptyState}>Loading reviews...</div>
            )}

            {/* Error State */}
            {error && (
                <div style={{ ...styles.emptyState, color: "#f87171" }}>{error}</div>
            )}

            {/* Empty State */}
            {!loading && !error && reviews.length === 0 && (
                <div style={styles.emptyState}>
                    No reviews found for this filter.
                </div>
            )}

            {/* Reviews List */}
            {!loading && !error && reviews.map((review) => (
                <div key={review.id} style={styles.reviewCard}>
                    <div style={styles.reviewHeader}>
                        <div style={styles.customerInfo}>
                            <div style={styles.customerName}>
                                {review.ownerName} - {review.dogNames.join(" & ")}
                            </div>
                            <div style={styles.serviceInfo}>
                                {review.serviceType} on {formatDate(review.serviceDate)}
                            </div>
                        </div>
                        <StarRating rating={review.rating} readonly size="sm" />
                    </div>

                    {/* Service Note */}
                    {review.serviceNote && (
                        <div style={{ marginBottom: "12px", color: "#60a5fa", fontSize: "0.9rem" }}>
                            <strong>Your note:</strong> "{review.serviceNote}"
                        </div>
                    )}

                    {/* Customer Review */}
                    <div style={styles.reviewText}>
                        "{review.reviewText}"
                    </div>

                    {/* Existing Admin Response */}
                    {review.adminResponse && editingReviewId !== review.id && (
                        <div style={styles.adminResponseBox}>
                            <div style={styles.adminResponseText}>
                                <strong>Your response:</strong> {review.adminResponse}
                            </div>
                            <div style={styles.buttonRow}>
                                <button
                                    style={styles.button("secondary")}
                                    onClick={() => handleStartEdit(review)}
                                >
                                    Edit
                                </button>
                                <button
                                    style={styles.button("danger")}
                                    onClick={() => handleDeleteResponse(review.id)}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Response Form */}
                    {editingReviewId === review.id ? (
                        <div>
                            <textarea
                                style={styles.textarea}
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Write your response..."
                                maxLength={1000}
                            />
                            <div style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "4px" }}>
                                {responseText.length}/1000
                            </div>
                            <div style={styles.buttonRow}>
                                <button
                                    style={styles.button("primary")}
                                    onClick={() => handleSubmitResponse(review.id)}
                                    disabled={submitting || !responseText.trim()}
                                >
                                    {submitting ? "Saving..." : "Save Response"}
                                </button>
                                <button
                                    style={styles.button("secondary")}
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : !review.adminResponse && (
                        <button
                            style={styles.button("primary")}
                            onClick={() => handleStartEdit(review)}
                        >
                            Add Response
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
