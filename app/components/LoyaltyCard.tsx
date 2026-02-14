"use client";

import React, { useState, useEffect } from "react";
import { format, isFuture } from "date-fns";
import { getServiceDisplayName } from '@/lib/serviceTypes';
import { formatPrice, getRewardTier } from '@/lib/pricing';

// --- Types ---
interface Booking {
    id: number;
    service_type: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: string;
    price_pounds: number;
    dog_names: string[];
}

interface CardInfo {
    card_index: number;
    stamps: number;
    avg_price: number;
}

interface FullCardInfo {
    card_index: number;
    avg_price: number;
    redeemed: boolean;
}

interface RedemptionInfo {
    card_index: number;
    max_value: number;
    booking_id: number;
    original_price: number;
    created_at: string;
}

interface LoyaltyData {
    total_qualifying_walks: number;
    current_card: CardInfo;
    full_cards: FullCardInfo[];
    total_redeemed: number;
    available_to_redeem: number;
    redemption_history: RedemptionInfo[];
}

interface LoyaltyCardProps {
    ownerId: number;
    bookings: Booking[];
}

// --- Paw Print SVG ---
function PawPrint({ filled, greyed, index }: { filled: boolean; greyed?: boolean; index: number }) {
    const fillColor = greyed ? "#4b5563" : (filled ? "#10b981" : "#1f2937");
    const borderColor = greyed ? "1px solid #374151" : (filled ? "2px solid #059669" : "2px dashed #4b5563");
    const svgFill = greyed ? "#6b7280" : (filled ? "#ffffff" : "#4b5563");

    return (
        <div
            style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: fillColor,
                border: borderColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
                transform: filled ? "scale(1)" : "scale(0.9)",
                opacity: greyed ? 0.6 : (filled ? 1 : 0.5),
                animation: (!greyed && filled) ? `stampIn 0.3s ease ${index * 0.05}s both` : undefined,
            }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={svgFill}>
                <ellipse cx="12" cy="16" rx="4.5" ry="3.5" />
                <ellipse cx="6.5" cy="9" rx="2" ry="2.5" transform="rotate(-15 6.5 9)" />
                <ellipse cx="17.5" cy="9" rx="2" ry="2.5" transform="rotate(15 17.5 9)" />
                <ellipse cx="9" cy="7" rx="1.8" ry="2.3" transform="rotate(-5 9 7)" />
                <ellipse cx="15" cy="7" rx="1.8" ry="2.3" transform="rotate(5 15 7)" />
            </svg>
        </div>
    );
}

// --- Single Card Visual ---
function CardVisual({
    stamps,
    cardIndex,
    isFull,
    isRedeemed,
    avgPrice,
    rewardTier,
    showBookingPicker,
    setShowBookingPicker,
    eligibleBookings,
    isRedeeming,
    handleRedeem,
}: {
    stamps: number;
    cardIndex: number;
    isFull: boolean;
    isRedeemed: boolean;
    avgPrice: number;
    rewardTier: number;
    showBookingPicker: boolean;
    setShowBookingPicker: (v: boolean) => void;
    eligibleBookings: Array<Booking & { eligible: boolean }>;
    isRedeeming: boolean;
    handleRedeem: (bookingId: number) => void;
}) {
    const isRedeemable = isFull && !isRedeemed;

    const cardStyle: React.CSSProperties = {
        backgroundColor: "#111827",
        border: isRedeemed
            ? "1px solid #374151"
            : isRedeemable
                ? "2px solid #f59e0b"
                : "1px solid #374151",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "16px",
        opacity: isRedeemed ? 0.4 : 1,
        ...(isRedeemable ? { boxShadow: "0 0 20px rgba(245, 158, 11, 0.15)", animation: "pulseGlow 3s ease-in-out infinite" } : {}),
    };

    return (
        <div style={cardStyle}>
            {/* Card Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                    <div style={{ color: "#fff", fontSize: "1rem", fontWeight: "700" }}>
                        Card #{cardIndex}
                    </div>
                    {isFull && (
                        <div style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "2px" }}>
                            Reward value: {formatPrice(rewardTier)}
                        </div>
                    )}
                </div>
                {isRedeemed && (
                    <span style={{
                        backgroundColor: "#374151",
                        color: "#9ca3af",
                        fontSize: "0.75rem",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontWeight: "600",
                    }}>
                        Redeemed
                    </span>
                )}
                {isRedeemable && (
                    <span style={{
                        backgroundColor: "#f59e0b",
                        color: "#000",
                        fontSize: "0.75rem",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontWeight: "700",
                    }}>
                        COMPLETE!
                    </span>
                )}
            </div>

            {/* Paw Print Grid - 5x3 */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 44px)",
                gap: "10px",
                justifyContent: "center",
                marginBottom: "16px",
            }}>
                {Array.from({ length: 15 }, (_, i) => (
                    <PawPrint
                        key={i}
                        filled={i < stamps}
                        greyed={isRedeemed}
                        index={i}
                    />
                ))}
            </div>

            {/* Progress Text */}
            <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "0.9rem", marginBottom: "8px" }}>
                <span style={{
                    fontWeight: "700",
                    fontSize: "1.1rem",
                    color: isRedeemed ? "#6b7280" : (isFull ? "#f59e0b" : "#10b981")
                }}>
                    {stamps}
                </span>
                <span> / 15 walks</span>
            </div>

            {/* Progress Bar */}
            <div style={{
                width: "100%",
                height: "6px",
                backgroundColor: "#1f2937",
                borderRadius: "3px",
                overflow: "hidden",
            }}>
                <div style={{
                    height: "100%",
                    width: `${(stamps / 15) * 100}%`,
                    backgroundColor: isRedeemed ? "#4b5563" : (isFull ? "#f59e0b" : "#10b981"),
                    borderRadius: "3px",
                    transition: "width 0.5s ease",
                }} />
            </div>

            {/* Redeem Button + Booking Picker */}
            {isRedeemable && (
                <div style={{ marginTop: "16px" }}>
                    {!showBookingPicker ? (
                        <button
                            style={{
                                padding: "12px 24px",
                                fontSize: "1rem",
                                fontWeight: "700",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                backgroundColor: "#f59e0b",
                                color: "#000",
                                transition: "all 0.2s",
                                width: "100%",
                            }}
                            onClick={() => setShowBookingPicker(true)}
                        >
                            Redeem Free Walk
                        </button>
                    ) : (
                        <div style={{ marginTop: "8px", textAlign: "left" }}>
                            <div style={{ color: "#d1d5db", fontSize: "0.9rem", fontWeight: "600", marginBottom: "12px" }}>
                                Choose a booking to apply your free walk:
                            </div>

                            {eligibleBookings.length === 0 ? (
                                <div style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>
                                    No upcoming Solo Walk or Quick Walk bookings found.
                                    Book a walk first, then come back to redeem!
                                </div>
                            ) : (
                                eligibleBookings.map(booking => (
                                    <div
                                        key={booking.id}
                                        style={{
                                            backgroundColor: "#1f2937",
                                            border: "1px solid #374151",
                                            borderRadius: "8px",
                                            padding: "14px",
                                            marginBottom: "8px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            ...(booking.eligible ? {} : { opacity: 0.5 }),
                                        }}
                                    >
                                        <div>
                                            <div style={{ color: "#fff", fontWeight: "600", fontSize: "0.9rem" }}>
                                                {getServiceDisplayName(booking.service_type)}
                                                {booking.duration_minutes && booking.duration_minutes > 60 &&
                                                    ` (${booking.duration_minutes / 60}hr)`
                                                }
                                            </div>
                                            <div style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "2px" }}>
                                                {format(new Date(booking.start_time), "EEE d MMM yyyy, h:mm a")}
                                            </div>
                                            <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                                                {booking.dog_names.join(" & ")}
                                            </div>
                                            <div style={{
                                                color: booking.eligible ? "#10b981" : "#ef4444",
                                                fontSize: "0.8rem",
                                                fontWeight: "600",
                                                marginTop: "2px"
                                            }}>
                                                {booking.eligible
                                                    ? `${formatPrice(booking.price_pounds)} → FREE`
                                                    : `${formatPrice(booking.price_pounds)} — above reward value (${formatPrice(rewardTier)})`
                                                }
                                            </div>
                                        </div>
                                        {booking.eligible && (
                                            <button
                                                style={{
                                                    padding: "8px 16px",
                                                    fontSize: "0.85rem",
                                                    fontWeight: "600",
                                                    borderRadius: "4px",
                                                    border: "none",
                                                    cursor: isRedeeming ? "not-allowed" : "pointer",
                                                    backgroundColor: "#10b981",
                                                    color: "#fff",
                                                    transition: "all 0.2s",
                                                    flexShrink: 0,
                                                    opacity: isRedeeming ? 0.5 : 1,
                                                }}
                                                onClick={() => handleRedeem(booking.id)}
                                                disabled={isRedeeming}
                                            >
                                                {isRedeeming ? "..." : "Apply"}
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}

                            <button
                                style={{
                                    padding: "8px 16px",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                    borderRadius: "4px",
                                    border: "1px solid #374151",
                                    cursor: "pointer",
                                    backgroundColor: "transparent",
                                    color: "#9ca3af",
                                    transition: "all 0.2s",
                                    width: "100%",
                                    marginTop: "8px",
                                }}
                                onClick={() => setShowBookingPicker(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Main Component ---
export default function LoyaltyCard({ ownerId, bookings }: LoyaltyCardProps) {
    const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showBookingPicker, setShowBookingPicker] = useState(false);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // --- Fetch loyalty data ---
    useEffect(() => {
        fetchLoyaltyData();
    }, [ownerId]);

    const fetchLoyaltyData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/dog-walking/loyalty?owner_id=${ownerId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch loyalty status");
            }

            setLoyaltyData(data.loyalty);
        } catch (err: any) {
            console.error("Failed to fetch loyalty data:", err);
            setError(err.message || "Failed to load loyalty card");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Redeem handler ---
    const handleRedeem = async (bookingId: number) => {
        try {
            setIsRedeeming(true);
            setError(null);

            const response = await fetch('/api/dog-walking/loyalty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner_id: ownerId, booking_id: bookingId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to redeem loyalty card");
            }

            setSuccessMessage(data.message);
            setShowBookingPicker(false);
            await fetchLoyaltyData();
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message || "Failed to redeem");
        } finally {
            setIsRedeeming(false);
        }
    };

    // --- Get eligible bookings for redemption ---
    const getEligibleBookings = () => {
        if (!loyaltyData) return [];

        const unredeemedCard = loyaltyData.full_cards.find(c => !c.redeemed);
        if (!unredeemedCard) return [];

        const tier = getRewardTier(unredeemedCard.avg_price);

        return bookings
            .filter(b =>
                b.status === 'confirmed' &&
                ['solo', 'quick'].includes(b.service_type) &&
                isFuture(new Date(b.start_time))
            )
            .map(b => ({
                ...b,
                eligible: (b.price_pounds || 0) <= tier
            }))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    };

    // --- Render ---
    if (isLoading) {
        return (
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "12px", padding: "24px" }}>
                    <div style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0" }}>
                        Loading loyalty card...
                    </div>
                </div>
            </div>
        );
    }

    if (error && !loyaltyData) {
        return (
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "12px", padding: "24px" }}>
                    <div style={{ textAlign: "center", color: "#ef4444", padding: "40px 0" }}>
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!loyaltyData) return null;

    const { current_card, full_cards, total_qualifying_walks, redemption_history } = loyaltyData;
    const eligibleBookings = getEligibleBookings();

    return (
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            {/* CSS animations */}
            <style>{`
                @keyframes stampIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    70% { transform: scale(1.15); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.15); }
                    50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.3); }
                }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "#fff", fontSize: "1.25rem", fontWeight: "700", marginBottom: "4px" }}>
                    Loyalty Card
                </div>
                <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                    Earn a free walk for every 15 completed walks
                </div>
                <div style={{ display: "flex", gap: "24px", color: "#6b7280", fontSize: "0.8rem", marginTop: "8px" }}>
                    <span>Total walks: {total_qualifying_walks}</span>
                    {loyaltyData.total_redeemed > 0 && (
                        <span>Free walks earned: {loyaltyData.total_redeemed}</span>
                    )}
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div style={{
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid #10b981",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    textAlign: "center",
                    color: "#10b981",
                    fontWeight: "600",
                }}>
                    {successMessage}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid #ef4444",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    textAlign: "center",
                    color: "#ef4444",
                    fontWeight: "600",
                }}>
                    {error}
                </div>
            )}

            {/* Full Cards (redeemed ones first, then unredeemed) */}
            {full_cards
                .slice()
                .sort((a, b) => {
                    // Unredeemed cards first, then redeemed
                    if (a.redeemed !== b.redeemed) return a.redeemed ? 1 : -1;
                    return a.card_index - b.card_index;
                })
                .map(card => (
                    <CardVisual
                        key={card.card_index}
                        stamps={15}
                        cardIndex={card.card_index}
                        isFull={true}
                        isRedeemed={card.redeemed}
                        avgPrice={card.avg_price}
                        rewardTier={getRewardTier(card.avg_price)}
                        showBookingPicker={showBookingPicker}
                        setShowBookingPicker={setShowBookingPicker}
                        eligibleBookings={eligibleBookings}
                        isRedeeming={isRedeeming}
                        handleRedeem={handleRedeem}
                    />
                ))
            }

            {/* Current (in-progress) Card */}
            {(current_card.stamps > 0 || full_cards.length > 0) && (
                <CardVisual
                    stamps={current_card.stamps}
                    cardIndex={current_card.card_index}
                    isFull={false}
                    isRedeemed={false}
                    avgPrice={current_card.avg_price}
                    rewardTier={0}
                    showBookingPicker={false}
                    setShowBookingPicker={() => {}}
                    eligibleBookings={[]}
                    isRedeeming={false}
                    handleRedeem={() => {}}
                />
            )}

            {/* Empty state when no walks at all */}
            {total_qualifying_walks === 0 && (
                <div style={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "12px",
                    padding: "24px",
                    marginBottom: "16px",
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div style={{ color: "#fff", fontSize: "1rem", fontWeight: "700" }}>Card #1</div>
                    </div>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 44px)",
                        gap: "10px",
                        justifyContent: "center",
                        marginBottom: "16px",
                    }}>
                        {Array.from({ length: 15 }, (_, i) => (
                            <PawPrint key={i} filled={false} index={i} />
                        ))}
                    </div>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "0.9rem" }}>
                        <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "#10b981" }}>0</span>
                        <span> / 15 walks</span>
                    </div>
                    <div style={{ width: "100%", height: "6px", backgroundColor: "#1f2937", borderRadius: "3px", marginTop: "8px" }} />
                    <div style={{ textAlign: "center", color: "#6b7280", fontSize: "0.8rem", marginTop: "12px" }}>
                        Complete your first walk to start earning stamps!
                    </div>
                </div>
            )}

            {/* Redemption History */}
            {redemption_history.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                    <button
                        style={{
                            padding: "8px 16px",
                            fontSize: "0.8rem",
                            fontWeight: "600",
                            borderRadius: "4px",
                            border: "1px solid #374151",
                            cursor: "pointer",
                            backgroundColor: "transparent",
                            color: "#9ca3af",
                            transition: "all 0.2s",
                            width: "100%",
                        }}
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        {showHistory ? "Hide" : "Show"} Redemption History ({redemption_history.length})
                    </button>

                    {showHistory && (
                        <div style={{ marginTop: "8px" }}>
                            {redemption_history.map((r, i) => (
                                <div key={i} style={{
                                    backgroundColor: "#1f2937",
                                    borderRadius: "6px",
                                    padding: "10px 14px",
                                    marginBottom: "6px",
                                    fontSize: "0.85rem",
                                    color: "#9ca3af",
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span>Card #{r.card_index} — saved {formatPrice(r.original_price)}</span>
                                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                            {format(new Date(r.created_at), "d MMM yyyy")}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
