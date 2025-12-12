"use client";

import React, { useState } from "react";
import DashboardAuth from "./DashboardAuth";
import DashboardMain from "./DashboardMain";
import BookingManager from "./BookingManager";
import AccountDetails from "./AccountDetails";
import SecondaryAddresses from "./SecondaryAddresses";

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
    // NEW: Partner fields (will be null for existing customers initially)
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
}

type DashboardView = "auth" | "main" | "booking" | "account" | "addresses";

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
            ? `/images/dogs/${firstDogWithPhoto.image_filename}`
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
            {view === "auth" && (
                <DashboardAuth onAuthSuccess={handleAuthSuccess} />
            )}

            {view === "main" && customer && (
                <DashboardMain
                    customer={customer}
                    onLogout={handleLogout}
                    onBookingSelect={handleBookingSelect}
                    onAccountView={handleAccountView}
                    onAddressesView={handleAddressesView} // NEW: Pass handler
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
                        href="/book-now"
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