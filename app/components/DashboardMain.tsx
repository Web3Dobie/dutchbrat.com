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
}

interface Booking {
    id: number;
    service_type: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: 'confirmed' | 'cancelled' | 'completed' | 'active'; // Added 'active' for compatibility
    price_pounds: number;
    dog_names: string[];
    created_at: string;
}

interface DashboardMainProps {
    customer: Customer;
    onLogout: () => void;
    onBookingSelect: (bookingId: number) => void;
}

export default function DashboardMain({ customer, onLogout, onBookingSelect }: DashboardMainProps) {
    // --- State ---
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Styles (matching existing theme) ---
    const styles = {
        container: {
            maxWidth: "800px",
            margin: "0 auto",
            padding: "16px",
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

            console.log("Fetched bookings:", data.bookings); // Debug log
            setBookings(data.bookings || []);
        } catch (err: any) {
            console.error("Failed to fetch bookings:", err);
            setError(err.message || "Could not load bookings. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helper Functions ---
    const getServiceDisplayName = (serviceType: string) => {
        const serviceMap: Record<string, string> = {
            'meet-greet': 'Meet & Greet',
            'solo-walk': 'Solo Walk (60 min)',
            'quick-walk': 'Quick Walk (30 min)',
            'dog-sitting': 'Dog Sitting (Variable)',
            'Dog Sitting (Variable)': 'Dog Sitting (Variable)', // Handle current format
            'Solo Walk (60 min)': 'Solo Walk (60 min)', // Handle current format
        };
        return serviceMap[serviceType] || serviceType;
    };

    const getBookingDateDisplay = (startTime: string, endTime?: string) => {
        const start = new Date(startTime);

        if (isToday(start)) return "Today";
        if (isTomorrow(start)) return "Tomorrow";

        // For multi-day bookings, show date range
        if (endTime) {
            const end = new Date(endTime);
            const startDate = format(start, "MMM d");
            const endDate = format(end, "MMM d");
            if (startDate !== endDate) {
                return `${startDate} - ${endDate}`;
            }
        }

        return format(start, "EEEE, MMM d");
    };

    const getTimeDisplay = (startTime: string, endTime?: string) => {
        const start = new Date(startTime);

        if (endTime) {
            const end = new Date(endTime);
            return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
        }

        return format(start, "h:mm a");
    };

    const getBookingStatusColor = (booking: Booking) => {
        const startTime = new Date(booking.start_time);

        if (booking.status === 'cancelled') return '#dc2626'; // Red
        if (booking.status === 'completed') return '#059669'; // Green
        if (isPast(startTime)) return '#6b7280'; // Gray (past)

        return '#3b82f6'; // Blue (upcoming)
    };

    const canManageBooking = (booking: Booking) => {
        // Only allow management of confirmed/active bookings
        if (!['confirmed', 'active'].includes(booking.status)) return false;

        const startTime = new Date(booking.start_time);
        const now = new Date();

        // Can manage if booking is more than 2 hours away
        return isBefore(addHours(now, 2), startTime);
    };

    // --- Separate bookings into categories ---
    // Upcoming: Soonest first (ASC)
    const upcomingBookings = bookings
        .filter(booking =>
            booking.status === 'confirmed' && !isPast(new Date(booking.start_time))
        )
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // History: Most recent first (DESC) 
    const pastBookings = bookings
        .filter(booking =>
            booking.status !== 'confirmed' || isPast(new Date(booking.start_time))
        )
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    // --- Render Booking Card ---
    const renderBookingCard = (booking: Booking) => {
        const startTime = new Date(booking.start_time);
        const canManage = canManageBooking(booking);
        const dateDisplay = getBookingDateDisplay(booking.start_time, booking.end_time);
        const timeDisplay = getTimeDisplay(booking.start_time, booking.end_time);

        return (
            <div key={booking.id} style={styles.bookingCard}>
                {/* Left border indicator */}
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
                        <p className="text-green-400 font-semibold">
                            {formatPrice(booking.price_pounds)}
                        </p>
                    </div>

                    {/* Action buttons - This is the key fix! */}
                    {canManage && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-700">
                            <button
                                style={{ ...styles.button, ...styles.primaryButton }}
                                onClick={() => onBookingSelect(booking.id)}
                                className="hover:bg-blue-600"
                            >
                                Manage Booking
                            </button>
                            <button
                                style={{ ...styles.button, ...styles.dangerButton }}
                                onClick={() => onBookingSelect(booking.id)}
                                className="hover:bg-red-600"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Show restriction message if can't manage */}
                    {['confirmed', 'active'].includes(booking.status) && !canManage && !isPast(startTime) && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-amber-400 text-sm font-medium mb-1">
                                ⏰ Changes must be made at least 2 hours before appointment
                            </p>
                            <p className="text-gray-300 text-sm">
                                Please contact <a href="tel:07932749772" className="text-blue-400 hover:text-blue-300 font-semibold">07932749772</a> for cancellation
                            </p>
                        </div>
                    )}

                    {/* Show contact info for past bookings */}
                    {(isPast(startTime) || ['cancelled', 'completed'].includes(booking.status)) && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-gray-400 text-sm">
                                Questions about this booking? Contact <a href="tel:07932749772" className="text-blue-400 hover:text-blue-300 font-semibold">07932749772</a>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- Main Render ---
    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div className="text-center py-8">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading your bookings...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div className="text-center py-8">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            style={{ ...styles.button, ...styles.primaryButton }}
                            onClick={fetchBookings}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.card}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-white text-2xl font-bold">
                            Welcome back, {customer.owner_name}!
                        </h1>
                        <p className="text-gray-400">
                            Manage your dog walking appointments
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <a
                            href="/book-now"
                            style={{ ...styles.button, ...styles.primaryButton }}
                            className="hover:bg-blue-600 text-center no-underline"
                        >
                            Book New Service
                        </a>
                        <button
                            style={{ ...styles.button, backgroundColor: "#374151", color: "#d1d5db" }}
                            onClick={onLogout}
                            className="hover:bg-gray-600"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
                <div style={styles.card}>
                    <h2 className="text-white text-xl font-semibold mb-4">
                        Upcoming Appointments ({upcomingBookings.length})
                    </h2>
                    <div>
                        {upcomingBookings.map(renderBookingCard)}
                    </div>
                </div>
            )}

            {/* Past Bookings */}
            <div style={styles.card}>
                <h2 className="text-white text-xl font-semibold mb-4">
                    Booking History ({pastBookings.length > 5 ? '5 most recent' : pastBookings.length})
                </h2>
                {pastBookings.length > 0 ? (
                    <div>
                        {pastBookings.slice(0, 5).map(renderBookingCard)}
                        {pastBookings.length > 5 && (
                            <p className="text-gray-400 text-center mt-4">
                                Booking History
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-4">
                        No booking history yet.
                    </p>
                )}
            </div>

            {/* No bookings message */}
            {bookings.length === 0 && (
                <div style={styles.card}>
                    <div className="text-center py-8">
                        <h2 className="text-white text-xl font-semibold mb-2">
                            No bookings yet
                        </h2>
                        <p className="text-gray-400 mb-4">
                            Ready to book your first dog walking service?
                        </p>
                        <a
                            href="/book-now"
                            style={{ ...styles.button, ...styles.primaryButton }}
                            className="hover:bg-blue-600 text-center no-underline"
                        >
                            Book Your First Service
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}