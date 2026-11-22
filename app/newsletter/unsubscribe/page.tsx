"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// 1. Move all your logic into a sub-component
function UnsubscribeContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    // Starts at "confirm": nothing happens until the button is pressed. The
    // page used to unsubscribe on load, which let link-scanning mail software
    // unsubscribe people by accident.
    const [status, setStatus] = useState<"confirm" | "loading" | "success" | "error">(
        token ? "confirm" : "error"
    );
    const [message, setMessage] = useState(token ? "" : "No unsubscribe token provided.");
    const [email, setEmail] = useState("");

    const unsubscribe = () => {
        if (!token) return;
        setStatus("loading");
        fetch(`/api/dog-walking/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, { method: "DELETE" })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStatus("success");
                    setMessage(data.message);
                    setEmail(data.email || "");
                } else {
                    setStatus("error");
                    setMessage(data.error || "Failed to unsubscribe.");
                }
            })
            .catch(() => {
                setStatus("error");
                setMessage("An error occurred. Please try again later.");
            });
    };

    return (
        <div style={{
            maxWidth: "500px",
            width: "100%",
            backgroundColor: "#1e293b",
            borderRadius: "12px",
            padding: "40px",
            textAlign: "center",
            border: "1px solid #334155"
        }}>
            {/* Logo */}
            <div style={{ marginBottom: "30px" }}>
                <span style={{ fontSize: "48px" }}>🐕</span>
                <h1 style={{ color: "#fff", fontSize: "24px", margin: "10px 0 0 0" }}>
                    Hunter's Hounds
                </h1>
            </div>

            {status === "confirm" && (
                <div>
                    <h2 style={{ color: "#fff", fontSize: "20px", marginBottom: "15px" }}>
                        Unsubscribe from the newsletter?
                    </h2>
                    <p style={{ color: "#94a3b8", lineHeight: "1.6", marginBottom: "25px" }}>
                        You will stop receiving the Hunter&apos;s Hounds monthly newsletter.
                        Booking confirmations and walk reminders are not affected.
                    </p>
                    <button
                        onClick={unsubscribe}
                        style={{
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "12px 28px",
                            fontSize: "16px",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        Unsubscribe
                    </button>
                </div>
            )}

            {status === "loading" && (
                <div>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        border: "4px solid #334155",
                        borderTop: "4px solid #3b82f6",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 20px"
                    }} />
                    <p style={{ color: "#94a3b8" }}>Processing your request...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            {status === "success" && (
                <div>
                    <div style={{
                        width: "60px",
                        height: "60px",
                        backgroundColor: "#065f46",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px"
                    }}>
                        <span style={{ fontSize: "30px" }}>✓</span>
                    </div>
                    <h2 style={{ color: "#10b981", marginBottom: "15px" }}>
                        Unsubscribed Successfully
                    </h2>
                    <p style={{ color: "#94a3b8", lineHeight: "1.6" }}>
                        {message}
                    </p>
                    {email && (
                        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "15px" }}>
                            ({email})
                        </p>
                    )}
                    <p style={{
                        color: "#64748b",
                        fontSize: "14px",
                        marginTop: "25px",
                        padding: "15px",
                        backgroundColor: "#0f172a",
                        borderRadius: "8px"
                    }}>
                        You will no longer receive our monthly newsletter.
                        We'll miss you! 🐾
                    </p>
                </div>
            )}

            {status === "error" && (
                <div>
                    <div style={{
                        width: "60px",
                        height: "60px",
                        backgroundColor: "#7f1d1d",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px"
                    }}>
                        <span style={{ fontSize: "30px" }}>✕</span>
                    </div>
                    <h2 style={{ color: "#ef4444", marginBottom: "15px" }}>
                        Unable to Unsubscribe
                    </h2>
                    <p style={{ color: "#94a3b8", lineHeight: "1.6" }}>
                        {message}
                    </p>
                    <p style={{ color: "#64748b", fontSize: "14px", marginTop: "25px" }}>
                        If you continue to have issues, please contact us at{" "}
                        <a href="mailto:bookings@hunters-hounds.london" style={{ color: "#3b82f6" }}>
                            bookings@hunters-hounds.london
                        </a>
                    </p>
                </div>
            )}

            <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #334155" }}>
                <a href="https://hunters-hounds.london" style={{ color: "#64748b", fontSize: "14px", textDecoration: "none" }}>
                    ← Back to Hunter's Hounds
                </a>
            </div>
        </div>
    );
}

// 2. The main page component that wraps the content in Suspense
export default function UnsubscribePage() {
    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
        }}>
            <Suspense fallback={<p style={{ color: "#94a3b8" }}>Loading...</p>}>
                <UnsubscribeContent />
            </Suspense>
        </div>
    );
}