"use client";

import React, { useState } from "react";
import DashboardAuth from "./DashboardAuth";
import DashboardMain from "./DashboardMain";
import BookingManager from "./BookingManager";

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

type DashboardView = "auth" | "main" | "booking";

export default function CustomerDashboard() {
    // --- State ---
    const [view, setView] = useState<DashboardView>("auth");
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

    // --- Handlers ---
    const handleAuthSuccess = (authenticatedCustomer: Customer) => {
        setCustomer(authenticatedCustomer);
        setView("main");
    };

    const handleLogout = () => {
        setCustomer(null);
        setSelectedBookingId(null);
        setView("auth");
    };

    const handleBookingSelect = (bookingId: number) => {
        setSelectedBookingId(bookingId);
        setView("booking");
    };

    const handleBackToDashboard = () => {
        setSelectedBookingId(null);
        setView("main");
    };

    const handleBookingUpdated = () => {
        // Trigger refresh in main dashboard (could use a refresh callback if needed)
        setView("main");
    };

    // --- Styles ---
    const containerStyles = {
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        paddingTop: "20px",
        paddingBottom: "40px",
    } as React.CSSProperties;

    // --- Render Views ---
    return (
        <div style={containerStyles}>
            {/* Header */}
            <div style={{ 
                maxWidth: "800px", 
                margin: "0 auto", 
                padding: "0 16px", 
                marginBottom: "20px" 
            }}>
                {view !== "auth" && (
                    <div style={{
                        textAlign: "center",
                        borderBottom: "1px solid #374151",
                        paddingBottom: "16px",
                        marginBottom: "20px"
                    }}>
                        <h1 style={{ 
                            color: "#fff", 
                            fontSize: "1.8rem", 
                            fontWeight: "bold",
                            margin: "0"
                        }}>
                            Hunter's Hounds Dashboard
                        </h1>
                        <p style={{ 
                            color: "#9ca3af", 
                            fontSize: "0.9rem",
                            margin: "8px 0 0 0"
                        }}>
                            Manage your dog walking appointments
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            {view === "auth" && (
                <DashboardAuth onAuthSuccess={handleAuthSuccess} />
            )}

            {view === "main" && customer && (
                <DashboardMain
                    customer={customer}
                    onLogout={handleLogout}
                    onBookingSelect={handleBookingSelect}
                />
            )}

            {view === "booking" && selectedBookingId && (
                <BookingManager
                    bookingId={selectedBookingId}
                    onBack={handleBackToDashboard}
                    onBookingUpdated={handleBookingUpdated}
                />
            )}

            {/* Footer */}
            <div style={{ 
                maxWidth: "800px", 
                margin: "40px auto 0", 
                padding: "20px 16px",
                textAlign: "center",
                borderTop: "1px solid #374151"
            }}>
                <p style={{ 
                    color: "#6b7280", 
                    fontSize: "0.85rem",
                    margin: "0 0 8px 0"
                }}>
                    Need help? Contact us anytime
                </p>
                <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    gap: "20px",
                    flexWrap: "wrap" as const
                }}>
                    <a 
                        href="tel:07932749772" 
                        style={{ 
                            color: "#3b82f6", 
                            textDecoration: "none",
                            fontSize: "0.9rem"
                        }}
                    >
                        📞 07932749772
                    </a>
                    <a 
                        href="mailto:info@dutchbrat.com" 
                        style={{ 
                            color: "#3b82f6", 
                            textDecoration: "none",
                            fontSize: "0.9rem"
                        }}
                    >
                        ✉️ info@dutchbrat.com
                    </a>
                    <a 
                        href="/dog-walking" 
                        style={{ 
                            color: "#10b981", 
                            textDecoration: "none",
                            fontSize: "0.9rem"
                        }}
                    >
                        📅 Book New Service
                    </a>
                </div>
            </div>
        </div>
    );
}