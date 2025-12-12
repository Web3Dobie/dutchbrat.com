"use client";

import React, { useState, useEffect } from "react";
import { format, isPast, isToday, isTomorrow, addHours, isBefore } from "date-fns";
import { formatPrice } from '@/lib/pricing';

// --- Types ---
interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
    dog_age: number;
}

interface Customer {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: Dog[];
    // NEW: Partner fields
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
}

interface Booking {
    id: number;
    service_type: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: 'confirmed' | 'cancelled' | 'completed' | 'completed & paid' | 'active';
    price_pounds: number;
    dog_names: string[];
    created_at: string;
    walk_summary?: string | null;
}

interface DashboardMainProps {
    customer: Customer;
    onLogout: () => void;
    onBookingSelect: (bookingId: number) => void;
    onAccountView: () => void;
    onAddressesView: () => void; // NEW: Add this handler
}

export default function DashboardMain({ customer, onLogout, onBookingSelect, onAccountView, onAddressesView }: DashboardMainProps) {
    // --- State ---
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'bookings' | 'account'>('bookings'); // NEW: Tab state

    // --- Styles (matching existing theme + new tab styles) ---
    const styles = {
        container: {
            maxWidth: "800px",
            margin: "0 auto",
            padding: "16px",
        } as React.CSSProperties,
        tabContainer: {
            display: "flex",
            borderBottom: "2px solid #374151",
            marginBottom: "24px",
        } as React.CSSProperties,
        tab: {
            padding: "12px 24px",
            fontSize: "1rem",
            fontWeight: "600",
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#9ca3af",
            borderBottom: "2px solid transparent",
            transition: "all 0.2s",
        } as React.CSSProperties,
        activeTab: {
            color: "#3b82f6",
            borderBottomColor: "#3b82f6",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
        } as React.CSSProperties,
        bookingCard: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
            position: "relative" as const,
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            fontSize: "0.875rem",
            fontWeight: "600",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            marginRight: "8px",
            marginTop: "8px",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        dangerButton: {
            backgroundColor: "#ef4444",
            color: "#fff",
        } as React.CSSProperties,
        statusBadge: {
            padding: "4px 8px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "12px",
            textTransform: "capitalize" as const,
        } as React.CSSProperties,
        logoutButton: {
            position: "absolute" as const,
            top: "20px",
            right: "20px",
            padding: "8px 16px",
            fontSize: "0.875rem",
            color: "#9ca3af",
            backgroundColor: "transparent",
            border: "1px solid #4b5563",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "all 0.2s",
        } as React.CSSProperties,
    };

    // --- Effects ---
    useEffect(() => {
        fetchBookings();
    }, [customer.owner_id]);

    // --- API Functions ---
    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/dog-walking/customer-bookings?owner_id=${customer.owner_id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch bookings");
            }

            console.log("Fetched bookings:", data.bookings);
            setBookings(data.bookings || []);
        } catch (err: any) {
            console.error("Failed to fetch bookings:", err);
            setError(err.message || "Could not load bookings. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helper Functions ---
    const getServiceDisplayName = (serviceType: string): string => {
        switch (serviceType) {
            case 'dog_walking':
                return 'Dog Walking';
            case 'dog_sitting':
                return 'Dog Sitting';
            case 'meet_greet':
                return 'Meet & Greet';
            default:
                return serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    const formatBookingDateTime = (startTime: string, endTime: string, durrationMinutes: number) => {
        const start = new Date(startTime);
        const end = new Date(endTime);

        let dateDisplay = "";
        if (isToday(start)) {
            dateDisplay = "Today";
        } else if (isTomorrow(start)) {
            dateDisplay = "Tomorrow";
        } else if (isPast(start)) {
            dateDisplay = format(start, "MMM d, yyyy");
        } else {
            dateDisplay = format(start, "EEE, MMM d");
        }

        const timeDisplay = `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;

        return { dateDisplay, timeDisplay };
    };

    const getBookingStatusColor = (booking: Booking): string => {
        switch (booking.status) {
            case 'confirmed': return '#3b82f6';
            case 'completed': return '#10b981';
            case 'completed & paid': return '#059669';
            case 'cancelled': return '#ef4444';
            case 'active': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    const canCancelBooking = (booking: Booking): boolean => {
        const bookingTime = new Date(booking.start_time);
        const now = new Date();
        const timeDifference = bookingTime.getTime() - now.getTime();
        const hoursDifference = timeDifference / (1000 * 3600);

        return booking.status === 'confirmed' && hoursDifference > 24;
    };

    const handleCancelBooking = (booking: Booking) => {
        const confirmCancel = window.confirm(
            `Are you sure you want to cancel your ${getServiceDisplayName(booking.service_type)} appointment on ${format(new Date(booking.start_time), "EEEE, MMMM d 'at' h:mm a")}?`
        );

        if (confirmCancel) {
            window.open(`/dog-walking/cancel?bookingId=${booking.id}`, '_blank');
        }
    };

    // --- NEW: Tab Change Handler ---
    const handleTabChange = (tab: 'bookings' | 'account' | 'addresses') => {
        if (tab === 'account') {
            onAccountView();
        } else if (tab === 'addresses') {
            onAddressesView(); // NEW: We need to add this prop
        } else {
            setActiveTab(tab);
        }
    };

    // --- Render ---
    return (
        <div style={styles.container}>
            {/* Logout Button */}
            <button
                onClick={onLogout}
                style={styles.logoutButton}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#374151";
                    e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9ca3af";
                }}
            >
                Logout
            </button>

            {/* Customer Info Card */}
            <div style={styles.card}>
                <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "1.25rem" }}>
                    Welcome back, {customer.owner_name}!
                </h2>
                <div style={{ color: "#d1d5db" }}>
                    <p style={{ margin: "0 0 8px 0" }}>📧 {customer.email}</p>
                    <p style={{ margin: "0 0 8px 0" }}>📞 {customer.phone}</p>
                    {customer.partner_name && (
                        <p style={{ margin: "0 0 8px 0" }}>
                            👫 Partner: {customer.partner_name}
                            {customer.partner_email && ` (${customer.partner_email})`}
                        </p>
                    )}
                    <p style={{ margin: "0" }}>📍 {customer.address}</p>
                </div>
            </div>

            {/* NEW: Tab Navigation */}
            <div style={styles.tabContainer}>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'bookings' ? styles.activeTab : {}),
                    }}
                    onClick={() => handleTabChange('bookings')}
                >
                    📅 My Bookings
                </button>
                <button
                    style={{
                        ...styles.tab,
                        // Account tab is never "active" here since we navigate away
                    }}
                    onClick={() => handleTabChange('account')}
                >
                    ⚙️ My Details
                </button>
                <button
                    style={{
                        ...styles.tab,
                        // Addresses tab is never "active" here since we navigate away
                    }}
                    onClick={() => handleTabChange('addresses')}
                >
                    📍 Secondary Addresses
                </button>
            </div>

            {/* Bookings Content (only show when bookings tab is active) */}
            {activeTab === 'bookings' && (
                <>
                    {/* Quick Actions */}
                    <div style={styles.card}>
                        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "1.1rem" }}>
                            Quick Actions
                        </h3>
                        <a
                            href="/book-now"
                            style={{
                                ...styles.button,
                                ...styles.primaryButton,
                                textDecoration: "none",
                                display: "inline-block",
                            }}
                        >
                            📅 Book New Service
                        </a>
                    </div>

                    {/* Bookings List */}
                    <div style={styles.card}>
                        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "1.1rem" }}>
                            Your Bookings
                        </h3>

                        {isLoading && (
                            <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>
                                Loading your bookings...
                            </p>
                        )}

                        {error && (
                            <div style={{
                                color: "#fecaca",
                                backgroundColor: "#7f1d1d",
                                padding: "12px",
                                borderRadius: "6px",
                                border: "1px solid #dc2626",
                                marginBottom: "16px"
                            }}>
                                {error}
                            </div>
                        )}

                        {!isLoading && !error && bookings.length === 0 && (
                            <div style={{ textAlign: "center", padding: "40px 20px" }}>
                                <p style={{ color: "#9ca3af", fontSize: "1.1rem", marginBottom: "16px" }}>
                                    No bookings found
                                </p>
                                <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                                    Ready to schedule your first dog walking service?
                                </p>
                                <a
                                    href="/book-now"
                                    style={{
                                        ...styles.button,
                                        ...styles.primaryButton,
                                        textDecoration: "none",
                                        display: "inline-block",
                                    }}
                                >
                                    Book Your First Walk
                                </a>
                            </div>
                        )}

                        {!isLoading && !error && bookings.length > 0 && bookings.map((booking) => {
                            const { dateDisplay, timeDisplay } = formatBookingDateTime(
                                booking.start_time,
                                booking.end_time,
                                booking.duration_minutes
                            );

                            return (
                                <div key={booking.id} style={styles.bookingCard}>
                                    {/* Status indicator stripe */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: "4px",
                                            backgroundColor: getBookingStatusColor(booking),
                                            borderTopLeftRadius: "8px",
                                            borderBottomLeftRadius: "8px",
                                        }}
                                    />

                                    {/* Main content */}
                                    <div style={{ marginLeft: "8px" }}>
                                        {/* Header row */}
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-white text-lg font-semibold mb-1">
                                                    {getServiceDisplayName(booking.service_type)}
                                                </h3>
                                                <p className="text-gray-300 text-sm">
                                                    {booking.dog_names?.join(' & ') || 'Unknown dogs'}
                                                </p>
                                            </div>
                                            <div
                                                style={{
                                                    ...styles.statusBadge,
                                                    backgroundColor: getBookingStatusColor(booking),
                                                    color: '#fff',
                                                }}
                                            >
                                                {booking.status}
                                            </div>
                                        </div>

                                        {/* Date and time */}
                                        <div className="flex justify-between items-center mb-3">
                                            <div>
                                                <p className="text-white font-medium">{dateDisplay}</p>
                                                <p className="text-gray-400 text-sm">{timeDisplay}</p>
                                            </div>
                                            <p className="text-blue-400 font-semibold">
                                                {formatPrice(booking.price_pounds)}
                                            </p>
                                        </div>

                                        {/* Walk summary (if completed) */}
                                        {booking.walk_summary && (
                                            <div style={{
                                                backgroundColor: "#065f46",
                                                border: "1px solid #059669",
                                                borderRadius: "6px",
                                                padding: "12px",
                                                marginBottom: "12px",
                                            }}>
                                                <p style={{ color: "#a7f3d0", margin: 0, fontSize: "0.9rem" }}>
                                                    <strong>Walk Summary:</strong> {booking.walk_summary}
                                                </p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div>
                                            <button
                                                onClick={() => onBookingSelect(booking.id)}
                                                style={{
                                                    ...styles.button,
                                                    ...styles.primaryButton,
                                                }}
                                            >
                                                View Details
                                            </button>

                                            {canCancelBooking(booking) && (
                                                <button
                                                    onClick={() => handleCancelBooking(booking)}
                                                    style={{
                                                        ...styles.button,
                                                        ...styles.dangerButton,
                                                    }}
                                                >
                                                    Cancel Booking
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}