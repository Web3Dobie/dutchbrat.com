"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// --- Route Segment Configuration (MUST be at top level) ---
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// --- Cancellation Content Component (wrapped by Suspense) ---
function CancellationContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const bookingId = searchParams.get("bookingId"); // NEW: Support dashboard cancellations

    const [status, setStatus] = useState<"processing" | "success" | "error" | "invalid">(
        "processing"
    );
    const [message, setMessage] = useState("Verifying and processing cancellation...");

    useEffect(() => {
        // Check if we have either token OR bookingId
        if (!token && !bookingId) {
            setStatus("invalid");
            setMessage("Invalid cancellation link. The cancellation token or booking ID is missing.");
            return;
        }

        const handleCancellation = async () => {
            try {
                const requestBody: any = {};
                
                // Use appropriate parameter for API call
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
                    setStatus("success");
                    setMessage("Your booking has been successfully cancelled.");
                } else {
                    setStatus("error");
                    setMessage(data.error || "Cancellation failed. Please try again.");
                }
            } catch (err) {
                setStatus("error");
                setMessage("A network error occurred. Please contact customer support.");
                console.error("Cancellation fetch error:", err);
            }
        };

        handleCancellation();
    }, [token, bookingId]); // Updated dependencies

    // --- Render based on Status ---
    const renderContent = () => {
        const cancellationId = token || bookingId || "N/A";
        
        switch (status) {
            case "processing":
                return (
                    <>
                        <h1 style={{ color: "#3b82f6" }}>Processing Cancellation...</h1>
                        <p>{message}</p>
                        <p>Please wait, do not close this window.</p>
                    </>
                );
            case "success":
                return (
                    <>
                        <h1 style={{ color: "#10b981" }}>✅ CANCELLATION CONFIRMED</h1>
                        <p>{message}</p>
                        <p>You may also receive a notification if your email provider confirms the calendar event was removed.</p>
                        <p style={{ marginTop: "15px", fontWeight: "bold" }}>
                            {token ? "Cancellation Token:" : "Booking ID:"} {cancellationId}
                        </p>
                        <a href="https://hunters-hounds.london/book-now" style={{ color: "#3b82f6", display: "block", marginTop: "20px" }}>
                            Book a new walk or return to the main page.
                        </a>
                    </>
                );
            case "error":
            case "invalid":
                return (
                    <>
                        <h1 style={{ color: "#ef4444" }}>❌ CANCELLATION FAILED</h1>
                        <p>{message}</p>
                        <p>If you believe this is an error, please contact us at **07932749772** immediately.</p>
                        <p style={{ marginTop: "15px", fontWeight: "bold" }}>
                            {token ? "Cancellation Token:" : "Booking ID:"} {cancellationId}
                        </p>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{
            maxWidth: "600px",
            margin: "50px auto",
            padding: "30px",
            textAlign: "center",
            backgroundColor: "#111827",
            color: "#d1d5db",
            borderRadius: "8px",
            border: "1px solid #333",
        }}>
            {renderContent()}
        </div>
    );
}

// --- Loading Fallback Component ---
function CancellationLoading() {
    return (
        <div style={{
            maxWidth: "600px",
            margin: "50px auto",
            padding: "30px",
            textAlign: "center",
            backgroundColor: "#111827",
            color: "#d1d5db",
            borderRadius: "8px",
            border: "1px solid #333",
        }}>
            <h1 style={{ color: "#3b82f6" }}>Loading Cancellation...</h1>
            <p>Preparing cancellation page...</p>
        </div>
    );
}

// --- Main Page Component (with Suspense Boundary) ---
export default function CancelPage() {
    return (
        <Suspense fallback={<CancellationLoading />}>
            <CancellationContent />
        </Suspense>
    );
}