"use client";

import React, { useState, useEffect } from "react";

// --- Types ---
interface Customer {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: Array<{
        id: number;
        dog_name: string;
        dog_breed: string;
        dog_age: number;
        image_filename?: string | null;
    }>;
}

interface MediaItem {
    id: number;
    filename: string;
    file_path: string;
    media_type: "image" | "video";
    file_size: number;
    taken_at: string | null;
    uploaded_at: string;
    description: string | null;
    thumbnail_path: string | null;
    displayDate: string;
}

interface MonthGroup {
    key: string;
    label: string;
    media: MediaItem[];
}

interface MyMediaProps {
    customer: Customer;
    onBack: () => void;
}

export default function MyMedia({ customer, onBack }: MyMediaProps) {
    // --- State ---
    const [months, setMonths] = useState<MonthGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

    // --- Styles ---
    const styles = {
        container: {
            maxWidth: "900px",
            margin: "0 auto",
            padding: "16px",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "20px",
        } as React.CSSProperties,
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
        } as React.CSSProperties,
        title: {
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#fff",
            margin: 0,
        } as React.CSSProperties,
        backButton: {
            padding: "8px 16px",
            backgroundColor: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500",
        } as React.CSSProperties,
        monthSection: {
            marginBottom: "32px",
        } as React.CSSProperties,
        monthTitle: {
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#9ca3af",
            marginBottom: "16px",
            paddingBottom: "8px",
            borderBottom: "1px solid #374151",
        } as React.CSSProperties,
        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "12px",
        } as React.CSSProperties,
        mediaCard: {
            position: "relative",
            aspectRatio: "1",
            borderRadius: "8px",
            overflow: "hidden",
            cursor: "pointer",
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            transition: "transform 0.2s, border-color 0.2s",
        } as React.CSSProperties,
        thumbnail: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
        } as React.CSSProperties,
        videoIndicator: {
            position: "absolute",
            top: "8px",
            right: "8px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
        } as React.CSSProperties,
        dateOverlay: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "8px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            color: "#fff",
            fontSize: "11px",
        } as React.CSSProperties,
        emptyState: {
            textAlign: "center",
            padding: "60px 20px",
            color: "#9ca3af",
        } as React.CSSProperties,
        emptyIcon: {
            fontSize: "48px",
            marginBottom: "16px",
        } as React.CSSProperties,
        // Modal styles
        modalOverlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
        } as React.CSSProperties,
        modalContent: {
            position: "relative",
            maxWidth: "90vw",
            maxHeight: "90vh",
        } as React.CSSProperties,
        modalMedia: {
            maxWidth: "100%",
            maxHeight: "85vh",
            objectFit: "contain",
            borderRadius: "8px",
        } as React.CSSProperties,
        modalClose: {
            position: "absolute",
            top: "-40px",
            right: "0",
            backgroundColor: "transparent",
            color: "#fff",
            border: "none",
            fontSize: "32px",
            cursor: "pointer",
            padding: "8px",
        } as React.CSSProperties,
        modalInfo: {
            marginTop: "12px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "14px",
        } as React.CSSProperties,
    };

    // --- Fetch Media ---
    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/customer-media");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch media");
            }

            setMonths(data.months || []);
        } catch (err: any) {
            console.error("Failed to fetch media:", err);
            setError(err.message || "Could not load media");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Media URL Helper ---
    // Uses nginx-media for direct file serving (same as memorial site)
    // Cache buster v3: forces refresh of thumbnails and videos after optimization changes
    const getMediaUrl = (item: MediaItem, useThumbnail: boolean = false) => {
        if (useThumbnail && item.thumbnail_path) {
            return `/client-media/${item.thumbnail_path}?v=3`;
        }
        // Add cache buster for videos to bypass CDN cache after re-encoding
        if (item.media_type === 'video') {
            return `/client-media/${item.file_path}?v=3`;
        }
        return `/client-media/${item.file_path}`;
    };

    // --- Render ---
    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={{ textAlign: "center", padding: "40px" }}>
                        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p style={{ color: "#9ca3af" }}>Loading your photos and videos...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>My Media</h1>
                    <button style={styles.backButton} onClick={onBack}>
                        ← Back
                    </button>
                </div>
                <p style={{ color: "#9ca3af", margin: 0 }}>
                    Photos and videos from your dog walks
                </p>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    ...styles.card,
                    borderColor: "#dc2626",
                    backgroundColor: "#1f2937"
                }}>
                    <p style={{ color: "#f87171", margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Empty State */}
            {!error && months.length === 0 && (
                <div style={styles.card}>
                    <div style={styles.emptyState as React.CSSProperties}>
                        <div style={styles.emptyIcon}>📷</div>
                        <h3 style={{ color: "#fff", marginBottom: "8px" }}>
                            No photos yet
                        </h3>
                        <p>
                            Photos and videos from your walks will appear here.
                        </p>
                    </div>
                </div>
            )}

            {/* Media by Month */}
            {months.map((month) => (
                <div key={month.key} style={styles.monthSection}>
                    <h2 style={styles.monthTitle}>{month.label}</h2>
                    <div style={styles.grid}>
                        {month.media.map((item) => (
                            <div
                                key={item.id}
                                style={styles.mediaCard as React.CSSProperties}
                                onClick={() => setSelectedMedia(item)}
                                onMouseOver={(e) => {
                                    (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                                    (e.currentTarget as HTMLElement).style.borderColor = "#3b82f6";
                                }}
                                onMouseOut={(e) => {
                                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                                    (e.currentTarget as HTMLElement).style.borderColor = "#374151";
                                }}
                            >
                                {item.media_type === "image" ? (
                                    <img
                                        src={getMediaUrl(item, true)}
                                        alt=""
                                        style={styles.thumbnail as React.CSSProperties}
                                        loading="lazy"
                                    />
                                ) : (
                                    <>
                                        {/* Video thumbnail - use generated thumbnail or placeholder */}
                                        {item.thumbnail_path ? (
                                            <img
                                                src={getMediaUrl(item, true)}
                                                alt=""
                                                style={styles.thumbnail as React.CSSProperties}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div style={{
                                                width: "100%",
                                                height: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "#1f2937"
                                            }}>
                                                <span style={{ fontSize: "48px" }}>🎥</span>
                                            </div>
                                        )}
                                        <div style={styles.videoIndicator as React.CSSProperties}>
                                            ▶ Video
                                        </div>
                                    </>
                                )}
                                <div style={styles.dateOverlay as React.CSSProperties}>
                                    {item.displayDate}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Modal for viewing media */}
            {selectedMedia && (
                <div
                    style={styles.modalOverlay as React.CSSProperties}
                    onClick={() => setSelectedMedia(null)}
                >
                    <div
                        style={styles.modalContent as React.CSSProperties}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            style={styles.modalClose as React.CSSProperties}
                            onClick={() => setSelectedMedia(null)}
                        >
                            ×
                        </button>

                        {selectedMedia.media_type === "image" ? (
                            <img
                                src={getMediaUrl(selectedMedia, false)}
                                alt=""
                                style={styles.modalMedia as React.CSSProperties}
                            />
                        ) : (
                            <video
                                src={getMediaUrl(selectedMedia, false)}
                                controls
                                autoPlay
                                style={styles.modalMedia as React.CSSProperties}
                            />
                        )}

                        <div style={styles.modalInfo as React.CSSProperties}>
                            {selectedMedia.displayDate}
                            {selectedMedia.description && (
                                <span> - {selectedMedia.description}</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
