"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const containerStyle: React.CSSProperties = {
    maxWidth: "600px",
    margin: "50px auto",
    padding: "30px",
    textAlign: "center",
    backgroundColor: "#111827",
    color: "#d1d5db",
    borderRadius: "8px",
    border: "1px solid #333",
};

function CancellationContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const bookingId = searchParams.get("bookingId");

    const [phase, setPhase] = useState<"confirm" | "fee-confirm" | "processing" | "success" | "error" | "invalid">(
        token || bookingId ? "confirm" : "invalid"
    );
    const [message, setMessage] = useState("");
    const [fee, setFee] = useState<{ amount: number; explanation: string } | null>(null);

    const handleConfirm = async (acknowledgeFee = false) => {
        setPhase("processing");
        try {
            const requestBody: Record<string, unknown> = {};
            if (acknowledgeFee) requestBody.acknowledge_fee = true;
            if (token) {
                requestBody.cancellation_token = token;
            } else if (bookingId) {
                requestBody.bookingId = parseInt(bookingId);
            }

            const res = await fetch("/api/dog-walking/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const data = await res.json();

            if (res.ok) {
                setPhase("success");
            } else if (res.status === 409 && data.requires_fee_acknowledgement) {
                // Nothing has been cancelled yet — show the fee and ask again.
                setFee({ amount: data.fee_pounds, explanation: data.message });
                setPhase("fee-confirm");
            } else {
                setPhase("error");
                setMessage(data.error || "Cancellation failed. Please try again.");
            }
        } catch {
            setPhase("error");
            setMessage("A network error occurred. Please contact customer support.");
        }
    };

    const ref = token || bookingId || "N/A";

    switch (phase) {
        case "confirm":
            return (
                <div style={containerStyle}>
                    <h1 style={{ color: "#f59e0b" }}>Cancel Your Booking?</h1>
                    <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>
                        Are you sure you want to cancel this booking?
                    </p>
                    <p style={{ color: "#9ca3af", marginBottom: "32px", fontSize: "0.9rem" }}>
                        This action cannot be undone. You will receive a cancellation confirmation by email.
                    </p>
                    <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                            onClick={() => handleConfirm(false)}
                            style={{
                                padding: "12px 28px",
                                fontWeight: "bold",
                                fontSize: "1rem",
                                color: "#fff",
                                backgroundColor: "#ef4444",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                            }}
                        >
                            Yes, Cancel My Booking
                        </button>
                        <a
                            href="/my-account"
                            style={{
                                padding: "12px 28px",
                                fontWeight: "bold",
                                fontSize: "1rem",
                                color: "#fff",
                                backgroundColor: "#374151",
                                borderRadius: "6px",
                                textDecoration: "none",
                                display: "inline-block",
                            }}
                        >
                            Keep My Booking
                        </a>
                    </div>
                </div>
            );

        case "fee-confirm":
            return (
                <div style={containerStyle}>
                    <h1 style={{ color: "#f59e0b" }}>A Cancellation Fee Applies</h1>
                    <div style={{
                        backgroundColor: "#422006",
                        border: "1px solid #f59e0b",
                        borderRadius: "8px",
                        padding: "20px",
                        margin: "20px 0",
                        textAlign: "left",
                    }}>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#fbbf24", textAlign: "center", marginBottom: "12px" }}>
                            £{fee?.amount.toFixed(2)}
                        </div>
                        <p style={{ color: "#fde68a", margin: 0, fontSize: "0.95rem", lineHeight: 1.6 }}>
                            {fee?.explanation}
                        </p>
                    </div>
                    <p style={{ color: "#9ca3af", marginBottom: "28px", fontSize: "0.9rem" }}>
                        Your booking has <strong>not</strong> been cancelled yet. If you would rather
                        discuss this first, keep the booking and call 07932749772.
                    </p>
                    <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                            onClick={() => handleConfirm(true)}
                            style={{
                                padding: "12px 28px",
                                fontWeight: "bold",
                                fontSize: "1rem",
                                color: "#fff",
                                backgroundColor: "#ef4444",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                            }}
                        >
                            Accept Fee &amp; Cancel
                        </button>
                        <a
                            href="/my-account"
                            style={{
                                padding: "12px 28px",
                                fontWeight: "bold",
                                fontSize: "1rem",
                                color: "#fff",
                                backgroundColor: "#374151",
                                borderRadius: "6px",
                                textDecoration: "none",
                                display: "inline-block",
                            }}
                        >
                            Keep My Booking
                        </a>
                    </div>
                </div>
            );

        case "processing":
            return (
                <div style={containerStyle}>
                    <h1 style={{ color: "#3b82f6" }}>Processing Cancellation...</h1>
                    <p>Please wait, do not close this window.</p>
                </div>
            );

        case "success":
            return (
                <div style={containerStyle}>
                    <h1 style={{ color: "#10b981" }}>✅ Booking Cancelled</h1>
                    <p>Your booking has been successfully cancelled.</p>
                    <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                        You will receive a cancellation confirmation email shortly.
                    </p>
                    <a
                        href="https://hunters-hounds.london/book-now"
                        style={{ color: "#3b82f6", display: "block", marginTop: "20px" }}
                    >
                        Book a new walk →
                    </a>
                </div>
            );

        case "error":
            return (
                <div style={containerStyle}>
                    <h1 style={{ color: "#ef4444" }}>❌ Cancellation Failed</h1>
                    <p>{message || "Something went wrong. Please try again."}</p>
                    <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                        If this keeps happening, please contact us on <strong>07932749772</strong>.
                    </p>
                    <p style={{ marginTop: "12px", fontSize: "0.85rem", color: "#6b7280" }}>
                        Reference: {ref}
                    </p>
                </div>
            );

        case "invalid":
        default:
            return (
                <div style={containerStyle}>
                    <h1 style={{ color: "#ef4444" }}>❌ Invalid Link</h1>
                    <p>This cancellation link is missing a valid token.</p>
                    <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                        Please use the link from your booking confirmation email, or contact us on <strong>07932749772</strong>.
                    </p>
                </div>
            );
    }
}

function CancellationLoading() {
    return (
        <div style={containerStyle}>
            <h1 style={{ color: "#3b82f6" }}>Loading...</h1>
        </div>
    );
}

export default function CancelPage() {
    return (
        <Suspense fallback={<CancellationLoading />}>
            <CancellationContent />
        </Suspense>
    );
}
