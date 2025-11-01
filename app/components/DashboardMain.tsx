"use client";

import React, { useState, useEffect } from "react";
import { format, isPast, isToday, isTomorrow, addHours, isBefore } from "date-fns";

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
    status: 'confirmed' | 'cancelled' | 'completed';
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
        button: {
            padding: "8px 16px",
            fontSize: "0.9rem",
            fontWeight: "600",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#374151",
            color: "#d1d5db",
        } as React.CSSProperties,
        dangerButton: {
            backgroundColor: "#dc2626",
            color: "#fff",
        } as React.CSSProperties,
        successButton: {
            backgroundColor: "#059669",
            color: "#fff",
        } as React.CSSProperties,
    };

    // --- Data Fetching ---
    useEffect(() => {
        fetchBookings();
    }, [customer.owner_id]);

    const fetchBookings = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/dog-walking/customer-bookings?owner_id=${customer.owner_id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load bookings");
            }

            setBookings(data.bookings || []);
        } catch (err: any) {
            console.error("Failed to fetch bookings:", err);
            setError(err.message || "Could not load your bookings. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helper Functions ---
    const getServiceDisplayName = (serviceType: string) => {
        const serviceMap: Record<string, string> = {
            'meetgreet': 'Meet & Greet',
            'solo': 'Solo Walk (60 min)',
            'quick': 'Quick Walk (30 min)',
            'sitting': 'Dog Sitting',
        };
        return serviceMap[serviceType] || serviceType;
    };

    const getBookingDateDisplay = (startTime: string) => {
        const date = new Date(startTime);
        
        if (isToday(date)) return "Today";
        if (isTomorrow(date)) return "Tomorrow";
        
        return format(date, "EEEE, MMM d");
    };

    const getBookingStatusColor = (booking: Booking) => {
        const startTime = new Date(booking.start_time);
        
        if (booking.status === 'cancelled') return '#dc2626'; // Red
        if (booking.status === 'completed') return '#059669'; // Green
        if (isPast(startTime)) return '#6b7280'; // Gray (past)
        
        return '#3b82f6'; // Blue (upcoming)
    };

    const canCancelBooking = (booking: Booking) => {
        if (booking.status !== 'confirmed') return false;
        
        const startTime = new Date(booking.start_time);
        const now = new Date();
        
        // Can cancel if booking is more than 2 hours away
        return isBefore(addHours(now, 2), startTime);
    };

    const canModifyBooking = (booking: Booking) => {
        return canCancelBooking(booking); // Same logic for now
    };

    // --- Separate bookings into categories ---
    const upcomingBookings = bookings.filter(booking => 
        booking.status === 'confirmed' && !isPast(new Date(booking.start_time))
    );
    
    const pastBookings = bookings.filter(booking => 
        booking.status !== 'confirmed' || isPast(new Date(booking.start_time))
    );

    // --- Render Booking Card ---
    const renderBookingCard = (booking: Booking) => {
        const startTime = new Date(booking.start_time);
        const endTime = booking.end_time ? new Date(booking.end_time) : null;
        
        return (
            <div 
                key={booking.id} 
                style={{
                    ...styles.card,
                    borderLeft: `4px solid ${getBookingStatusColor(booking)}`,
                }}
            >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <div>
                        <h3 className="text-white font-semibold text-lg">
                            {getServiceDisplayName(booking.service_type)}
                        </h3>
                        <p className="text-gray-300 text-sm">
                            {booking.dog_names.join(" & ")}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-white font-medium">
                            {getBookingDateDisplay(booking.start_time)}
                        </div>
                        <div className="text-gray-300 text-sm">
                            {format(startTime, "h:mm a")}
                            {endTime && ` - ${format(endTime, "h:mm a")}`}
                        </div>
                    </div>
                </div>

                {/* Status and Price */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                    <div>
                        <span 
                            className="inline-block px-2 py-1 rounded text-xs font-medium"
                            style={{ 
                                backgroundColor: getBookingStatusColor(booking) + '20',
                                color: getBookingStatusColor(booking),
                            }}
                        >
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                    </div>
                    {booking.price_pounds && (
                        <div className="text-white font-medium">
                            £{booking.price_pounds.toFixed(2)}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {booking.status === 'confirmed' && !isPast(startTime) && (
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={() => onBookingSelect(booking.id)}
                            className="hover:bg-gray-600"
                        >
                            View Details
                        </button>
                        
                        {canModifyBooking(booking) && (
                            <button
                                style={{ ...styles.button, ...styles.primaryButton }}
                                onClick={() => onBookingSelect(booking.id)}
                                className="hover:bg-blue-600"
                            >
                                Reschedule
                            </button>
                        )}
                        
                        {canCancelBooking(booking) && (
                            <button
                                style={{ ...styles.button, ...styles.dangerButton }}
                                onClick={() => onBookingSelect(booking.id)}
                                className="hover:bg-red-700"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                )}
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

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.card}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-white text-2xl font-bold">
                            Welcome back, {customer.owner_name}!
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Manage your dog walking appointments
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            style={{ ...styles.button, ...styles.successButton }}
                            onClick={() => window.location.href = '/dog-walking'}
                            className="hover:bg-green-700"
                        >
                            Book New Service
                        </button>
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={onLogout}
                            className="hover:bg-gray-600"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={styles.card}>
                    <div 
                        className="p-4 rounded border"
                        style={{
                            backgroundColor: "#7f1d1d",
                            borderColor: "#dc2626",
                            color: "#ef4444",
                        }}
                    >
                        {error}
                    </div>
                </div>
            )}

            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
                <div>
                    <h2 className="text-white text-xl font-semibold mb-4">
                        Upcoming Appointments ({upcomingBookings.length})
                    </h2>
                    {upcomingBookings.map(renderBookingCard)}
                </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
                <div>
                    <h2 className="text-white text-xl font-semibold mb-4">
                        Booking History ({pastBookings.length})
                    </h2>
                    {pastBookings.slice(0, 5).map(renderBookingCard)}
                    
                    {pastBookings.length > 5 && (
                        <div style={styles.card}>
                            <p className="text-gray-400 text-center">
                                Showing 5 most recent. Contact us to view older bookings.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* No Bookings State */}
            {bookings.length === 0 && !error && (
                <div style={styles.card}>
                    <div className="text-center py-8">
                        <h3 className="text-white text-lg font-medium mb-2">
                            No bookings found
                        </h3>
                        <p className="text-gray-400 mb-6">
                            You haven't made any bookings yet. Ready to book your first service?
                        </p>
                        <button
                            style={{ ...styles.button, ...styles.primaryButton }}
                            onClick={() => window.location.href = '/dog-walking'}
                            className="hover:bg-blue-600"
                        >
                            Book Your First Walk
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}