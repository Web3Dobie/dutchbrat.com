"use client";

import React, { useState } from "react";

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
    }>;
}

interface DashboardAuthProps {
    onAuthSuccess: (customer: Customer) => void;
}

export default function DashboardAuth({ onAuthSuccess }: DashboardAuthProps) {
    // --- State ---
    const [searchInput, setSearchInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Styles (matching existing BookingForm.tsx) ---
    const styles = {
        container: {
            maxWidth: "500px",
            margin: "0 auto",
            padding: "24px",
        } as React.CSSProperties,
        form: {
            padding: "24px",
            border: "1px solid #333",
            borderRadius: "8px",
            backgroundColor: "#111827",
        } as React.CSSProperties,
        label: {
            display: "block",
            marginBottom: "4px",
            fontSize: "0.9rem",
            color: "#d1d5db",
        } as React.CSSProperties,
        input: {
            width: "100%",
            padding: "12px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: "1rem",
        } as React.CSSProperties,
        button: {
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            fontWeight: "bold",
            color: "#fff",
            backgroundColor: "#3b82f6",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
        } as React.CSSProperties,
        buttonDisabled: {
            backgroundColor: "#374151",
            cursor: "not-allowed",
        } as React.CSSProperties,
        error: {
            color: "#ef4444",
            fontSize: "0.9rem",
            marginBottom: "16px",
            padding: "8px",
            backgroundColor: "#7f1d1d",
            border: "1px solid #dc2626",
            borderRadius: "4px",
        } as React.CSSProperties,
        hint: {
            fontSize: "0.85rem",
            color: "#9ca3af",
            marginBottom: "16px",
            lineHeight: "1.4",
        } as React.CSSProperties,
    };

    // --- Handlers ---
    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!searchInput.trim()) {
            setError("Please enter your phone number or email address.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Determine if input is email or phone
            const isEmail = searchInput.includes("@");
            const queryParam = isEmail ? `email=${encodeURIComponent(searchInput)}` : `phone=${encodeURIComponent(searchInput)}`;
            
            const response = await fetch(`/api/dog-walking/customer-lookup?${queryParam}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to find your account");
            }

            if (data.found) {
                // Success - customer found
                onAuthSuccess(data.customer);
            } else {
                // Customer not found
                setError("No account found with that phone number or email. Please check your details or contact us if you believe this is an error.");
            }

        } catch (err: any) {
            console.error("Customer lookup error:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Render ---
    return (
        <div style={styles.container}>
            <div style={styles.form}>
                {/* Header */}
                <div style={{ marginBottom: "24px", textAlign: "center" }}>
                    <h2 style={{ 
                        color: "#fff", 
                        fontSize: "1.5rem", 
                        fontWeight: "bold", 
                        marginBottom: "8px" 
                    }}>
                        Access Your Bookings
                    </h2>
                    <p style={styles.hint}>
                        Enter the phone number or email address you used when booking to view your appointments.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLookup}>
                    <label style={styles.label} htmlFor="searchInput">
                        Phone Number or Email Address
                    </label>
                    <input
                        style={styles.input}
                        type="text"
                        id="searchInput"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Enter your phone or email"
                        disabled={isLoading}
                        autoComplete="tel email"
                    />

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        style={{
                            ...styles.button,
                            ...(isLoading ? styles.buttonDisabled : {}),
                        }}
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "Searching..." : "View My Bookings"}
                    </button>
                </form>

                {/* Help text */}
                <div style={{ 
                    ...styles.hint, 
                    textAlign: "center", 
                    marginTop: "24px",
                    paddingTop: "16px",
                    borderTop: "1px solid #374151"
                }}>
                    <p>Can't find your account?</p>
                    <p style={{ marginTop: "4px" }}>
                        <a 
                            href="mailto:info@hunters-hounds.london" 
                            style={{ color: "#3b82f6", textDecoration: "underline" }}
                        >
                            Contact us
                        </a> or call{" "}
                        <a 
                            href="tel:07932749772" 
                            style={{ color: "#3b82f6", textDecoration: "underline" }}
                        >
                            07932749772
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}