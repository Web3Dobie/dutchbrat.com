"use client";

import React, { useState, useEffect } from "react";
import DashboardAuth from "./DashboardAuth";
import DashboardMain from "./DashboardMain";
import BookingManager from "./BookingManager";
import AccountDetails from "./AccountDetails";
import SecondaryAddresses from "./SecondaryAddresses";
import MyMedia from "./MyMedia";

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
    // Partner fields
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
    // Vet & Insurance fields
    vet_info?: string | null;
    pet_insurance?: string | null;
    // Photo sharing consent
    photo_sharing_consent?: boolean;
}

type DashboardView = "auth" | "main" | "booking" | "account" | "addresses" | "media";

export default function CustomerDashboard() {
    // --- State ---
    const [view, setView] = useState<DashboardView>("auth");
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    // --- Check for existing session on mount ---
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/api/dog-walking/customer-session');
                const data = await response.json();

                if (data.authenticated && data.customer) {
                    console.log('[CustomerDashboard] Found existing session for:', data.customer.owner_name);
                    setCustomer(data.customer);
                    setView("main");
                }
            } catch (err) {
                console.error('[CustomerDashboard] Session check failed:', err);
            } finally {
                setIsCheckingSession(false);
            }
        };

        checkSession();
    }, []);

    // --- Handlers ---
    const handleAuthSuccess = (authenticatedCustomer: Customer) => {
        setCustomer(authenticatedCustomer);
        setView("main");
    };

    const handleLogout = async () => {
        // Clear session cookie
        try {
            await fetch('/api/dog-walking/customer-session', { method: 'DELETE' });
            console.log('[CustomerDashboard] Session cookie cleared');
        } catch (err) {
            console.error('[CustomerDashboard] Failed to clear session cookie:', err);
        }

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
        // Trigger refresh in main dashboard
        setView("main");
    };

    // NEW: Account management handlers
    const handleAccountView = () => {
        setView("account");
    };

    // NEW: Addresses handler
    const handleAddressesView = () => {
        setView("addresses");
    };

    // NEW: Media handler
    const handleMediaView = () => {
        setView("media");
    };

    const handleCustomerUpdated = (updatedCustomer: Customer) => {
        setCustomer(updatedCustomer);
        // Optionally stay on account view or return to main
        // setView("main"); // Uncomment if you want to return to main after save
    };

    // --- Helper Functions for Personalization ---
    const generateDashboardTitle = (dogs: Customer['dogs']): string => {
        if (!dogs || dogs.length === 0) return "Hunter's Hounds Dashboard";

        const names = dogs.map(d => d.dog_name);
        if (names.length === 1) return `${names[0]}'s Dashboard`;
        if (names.length === 2) return `${names[0]} & ${names[1]} Dashboard`;
        if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]} Dashboard`;
        return `${names[0]}, ${names[1]} & ${names.length - 2} Others Dashboard`;
    };

    const getDisplayPhoto = (dogs: Customer['dogs']): string | null => {
        const firstDogWithPhoto = dogs?.find(dog => dog.image_filename);
        return firstDogWithPhoto?.image_filename
            ? `/api/dog-images/${firstDogWithPhoto.image_filename}`
            : null;
    };

    // --- Styles ---
    const containerStyles = {
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        paddingTop: "20px",
        paddingBottom: "40px",
    } as React.CSSProperties;

    const getHeaderStyles = () => {
        const photoPath = customer ? getDisplayPhoto(customer.dogs) : null;

        return {
            textAlign: photoPath ? "left" : "center",
            borderBottom: "1px solid #374151",
            paddingBottom: "16px",
            marginBottom: "20px",
            display: photoPath ? "flex" : "block",
            alignItems: photoPath ? "center" : "unset",
            gap: photoPath ? "20px" : "unset"
        } as React.CSSProperties;
    };

    // --- Render Views ---
    return (
        <div style={containerStyles}>
            {/* Header - Enhanced with personalization */}
            <div style={{
                maxWidth: "800px",
                margin: "0 auto",
                padding: "0 16px",
                marginBottom: "20px"
            }}>
                {view !== "auth" && customer && (
                    <div style={getHeaderStyles()}>
                        {/* Title Section */}
                        <div style={{ flex: 1 }}>
                            <h1 style={{
                                color: "#fff",
                                fontSize: "1.8rem",
                                fontWeight: "bold",
                                margin: "0"
                            }}>
                                {generateDashboardTitle(customer.dogs)}
                            </h1>
                            <p style={{
                                color: "#9ca3af",
                                fontSize: "0.9rem",
                                margin: "8px 0 0 0"
                            }}>
                                Manage your dog walking appointments and account
                            </p>
                        </div>

                        {/* Photo Section - Only show if photo exists */}
                        {getDisplayPhoto(customer.dogs) && (
                            <div style={{
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center"
                            }}>
                                <img
                                    src={getDisplayPhoto(customer.dogs)!}
                                    alt={`${customer.dogs.find(d => d.image_filename)?.dog_name || 'Dog'} photo`}
                                    style={{
                                        width: "80px",
                                        height: "80px",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: "3px solid #3b82f6",
                                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)"
                                    }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Fallback for auth view */}
                {view !== "auth" && !customer && (
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
                            Manage your dog walking appointments and account
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            {isCheckingSession && (
                <div style={{
                    maxWidth: "500px",
                    margin: "0 auto",
                    padding: "40px 24px",
                    textAlign: "center"
                }}>
                    <div style={{
                        padding: "24px",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        backgroundColor: "#111827"
                    }}>
                        <p style={{ color: "#9ca3af" }}>Loading your account...</p>
                    </div>
                </div>
            )}

            {!isCheckingSession && view === "auth" && (
                <DashboardAuth onAuthSuccess={handleAuthSuccess} />
            )}

            {!isCheckingSession && view === "main" && customer && (
                <DashboardMain
                    customer={customer}
                    onLogout={handleLogout}
                    onBookingSelect={handleBookingSelect}
                    onAccountView={handleAccountView}
                    onAddressesView={handleAddressesView}
                    onMediaView={handleMediaView}
                />
            )}

            {view === "booking" && selectedBookingId && (
                <BookingManager
                    bookingId={selectedBookingId}
                    onBack={handleBackToDashboard}
                    onBookingUpdated={handleBookingUpdated}
                />
            )}

            {/* NEW: Account Details View */}
            {view === "account" && customer && (
                <AccountDetails
                    customer={customer}
                    onCustomerUpdated={handleCustomerUpdated}
                    onBack={handleBackToDashboard}
                />
            )}

            {/* NEW: Secondary Addresses View */}
            {view === "addresses" && customer && (
                <SecondaryAddresses
                    customer={customer}
                    onBack={handleBackToDashboard}
                />
            )}

            {/* NEW: My Media View */}
            {view === "media" && customer && (
                <MyMedia
                    customer={customer}
                    onBack={handleBackToDashboard}
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
                        href="mailto:ernesto@hunters-hounds.london"
                        style={{
                            color: "#3b82f6",
                            textDecoration: "none",
                            fontSize: "0.9rem"
                        }}
                    >
                        ✉️ ernesto@hunters-hounds.london
                    </a>
                    <a
                        href={customer ? `/book-now?userId=${customer.owner_id}&phone=${encodeURIComponent(customer.phone)}&email=${encodeURIComponent(customer.email)}` : "/book-now"}
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