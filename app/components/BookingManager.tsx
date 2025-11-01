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

interface BookingDetails {
    id: number;
    service_type: string;
    start_time: string;
    end_time: string | null;
    duration_minutes: number;
    status: 'confirmed' | 'cancelled' | 'completed';
    price_pounds: number | null;
    created_at: string;
    dogs: Dog[];
    owner_name: string;
    owner_phone: string;
    owner_email: string;
    address: string;
}

interface ApiRange {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
}

interface BookingManagerProps {
    bookingId: number;
    onBack: () => void;
    onBookingUpdated: () => void;
}

type View = "details" | "cancel" | "reschedule";

export default function BookingManager({ bookingId, onBack, onBookingUpdated }: BookingManagerProps) {
    // --- State ---
    const [view, setView] = useState<View>("details");
    const [booking, setBooking] = useState<BookingDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Reschedule specific state
    const [newDate, setNewDate] = useState<Date | undefined>(undefined);
    const [availableSlots, setAvailableSlots] = useState<ApiRange[]>([]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
    const [loadingSlots, setLoadingSlots] = useState(false);
    
    // Cancel specific state
    const [cancelReason, setCancelReason] = useState("");

    // --- Styles ---
    const styles = {
        container: {
            maxWidth: "600px",
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
        input: {
            width: "100%",
            padding: "8px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: "1rem",
        } as React.CSSProperties,
        textarea: {
            width: "100%",
            padding: "8px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: "1rem",
            minHeight: "80px",
            resize: "vertical" as const,
        } as React.CSSProperties,
        label: {
            display: "block",
            marginBottom: "4px",
            fontSize: "0.9rem",
            color: "#d1d5db",
        } as React.CSSProperties,
    };

    // --- Data Fetching ---
    useEffect(() => {
        fetchBookingDetails();
    }, [bookingId]);

    const fetchBookingDetails = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/dog-walking/booking-details?id=${bookingId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load booking details");
            }

            setBooking(data.booking);
        } catch (err: any) {
            console.error("Failed to fetch booking:", err);
            setError(err.message || "Could not load booking details. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Availability Fetching for Reschedule ---
    const fetchAvailableSlots = async (date: Date) => {
        if (!booking) return;

        setLoadingSlots(true);
        setError(null);

        try {
            const formattedDate = format(date, "yyyy-MM-dd");
            const response = await fetch(
                `/api/dog-walking/availability?date=${formattedDate}&service_type=${booking.service_type}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load available times");
            }

            setAvailableSlots(data.availableRanges || []);
        } catch (err: any) {
            console.error("Failed to fetch availability:", err);
            setError(err.message || "Could not load available times.");
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    };

    // --- Handler Functions ---
    const handleCancelBooking = async () => {
        if (!booking) return;

        setIsProcessing(true);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/cancel", {  // ← Use existing route
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    bookingId: booking.id,  // ← Your existing route accepts this
                    // Note: Could add reason field to existing route if desired
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to cancel booking");
            }

            // Success
            onBookingUpdated(); // Refresh parent data
            onBack(); // Go back to dashboard
        } catch (err: any) {
            console.error("Failed to cancel booking:", err);
            setError(err.message || "Could not cancel booking. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRescheduleBooking = async () => {
        if (!booking || !newDate || !selectedTimeSlot) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Create new start time
            const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
            const newStartTime = new Date(newDate);
            newStartTime.setHours(hours, minutes, 0, 0);

            // Calculate end time based on duration
            const newEndTime = new Date(newStartTime);
            newEndTime.setMinutes(newEndTime.getMinutes() + booking.duration_minutes);

            const response = await fetch("/api/dog-walking/reschedule-booking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    booking_id: booking.id,
                    new_start_time: newStartTime.toISOString(),
                    new_end_time: newEndTime.toISOString(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to reschedule booking");
            }

            // Success
            onBookingUpdated(); // Refresh parent data
            onBack(); // Go back to dashboard
        } catch (err: any) {
            console.error("Failed to reschedule booking:", err);
            setError(err.message || "Could not reschedule booking. Please try again.");
        } finally {
            setIsProcessing(false);
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

    const canCancelBooking = () => {
        if (!booking || booking.status !== 'confirmed') return false;
        
        const startTime = new Date(booking.start_time);
        const now = new Date();
        
        // Can cancel if booking is more than 2 hours away
        return isBefore(addHours(now, 2), startTime);
    };

    const canRescheduleBooking = () => {
        return canCancelBooking(); // Same logic for now
    };

    // --- Generate Time Slots ---
    const generateTimeSlots = (ranges: ApiRange[], duration: number): string[] => {
        const slots: string[] = [];
        
        for (const range of ranges) {
            const [startHour, startMin] = range.start.split(':').map(Number);
            const [endHour, endMin] = range.end.split(':').map(Number);
            
            let current = new Date();
            current.setHours(startHour, startMin, 0, 0);
            
            const rangeEnd = new Date();
            rangeEnd.setHours(endHour, endMin, 0, 0);
            
            while (current.getTime() + (duration * 60 * 1000) <= rangeEnd.getTime()) {
                slots.push(format(current, "HH:mm"));
                current.setMinutes(current.getMinutes() + 30); // 30-minute intervals
            }
        }
        
        return slots;
    };

    // --- Render Functions ---
    const renderDetailsView = () => {
        if (!booking) return null;

        const startTime = new Date(booking.start_time);
        const endTime = booking.end_time ? new Date(booking.end_time) : null;

        return (
            <div>
                {/* Header */}
                <div style={styles.card}>
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-white text-xl font-bold">
                            Booking Details
                        </h1>
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={onBack}
                            className="hover:bg-gray-600"
                        >
                            ← Back
                        </button>
                    </div>
                </div>

                {/* Booking Information */}
                <div style={styles.card}>
                    <h2 className="text-white text-lg font-semibold mb-4">
                        {getServiceDisplayName(booking.service_type)}
                    </h2>
                    
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Date:</span>
                            <span className="text-white font-medium">
                                {format(startTime, "EEEE, MMMM d, yyyy")}
                            </span>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-gray-400">Time:</span>
                            <span className="text-white font-medium">
                                {format(startTime, "h:mm a")}
                                {endTime && ` - ${format(endTime, "h:mm a")}`}
                            </span>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white font-medium">
                                {booking.duration_minutes} minutes
                            </span>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-gray-400">Dogs:</span>
                            <span className="text-white font-medium">
                                {booking.dogs.map(dog => `${dog.dog_name} (${dog.dog_breed})`).join(", ")}
                            </span>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span 
                                className="font-medium capitalize"
                                style={{ 
                                    color: booking.status === 'confirmed' ? '#10b981' : 
                                           booking.status === 'cancelled' ? '#ef4444' : '#6b7280'
                                }}
                            >
                                {booking.status}
                            </span>
                        </div>
                        
                        {booking.price_pounds && (
                            <div className="flex justify-between">
                                <span className="text-gray-400">Price:</span>
                                <span className="text-white font-medium">
                                    £{booking.price_pounds.toFixed(2)}
                                </span>
                            </div>
                        )}
                        
                        <div className="flex justify-between">
                            <span className="text-gray-400">Booked:</span>
                            <span className="text-gray-300">
                                {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                {booking.status === 'confirmed' && !isPast(startTime) && (
                    <div style={styles.card}>
                        <h3 className="text-white text-md font-medium mb-4">Actions</h3>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            {canRescheduleBooking() && (
                                <button
                                    style={{ ...styles.button, ...styles.primaryButton }}
                                    onClick={() => setView("reschedule")}
                                    className="hover:bg-blue-600"
                                >
                                    Reschedule Booking
                                </button>
                            )}
                            
                            {canCancelBooking() && (
                                <button
                                    style={{ ...styles.button, ...styles.dangerButton }}
                                    onClick={() => setView("cancel")}
                                    className="hover:bg-red-700"
                                >
                                    Cancel Booking
                                </button>
                            )}
                        </div>
                        
                        {!canCancelBooking() && booking.status === 'confirmed' && (
                            <p className="text-gray-400 text-sm mt-3">
                                Bookings can only be cancelled or rescheduled up to 2 hours before the appointment time.
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderCancelView = () => {
        if (!booking) return null;

        return (
            <div>
                {/* Header */}
                <div style={styles.card}>
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-white text-xl font-bold">
                            Cancel Booking
                        </h1>
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={() => setView("details")}
                            className="hover:bg-gray-600"
                        >
                            ← Back
                        </button>
                    </div>
                </div>

                {/* Cancellation Form */}
                <div style={styles.card}>
                    <div className="mb-4">
                        <h2 className="text-white text-lg font-medium mb-2">
                            Cancel: {getServiceDisplayName(booking.service_type)}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {format(new Date(booking.start_time), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </p>
                    </div>

                    <div className="mb-4">
                        <label style={styles.label} htmlFor="cancelReason">
                            Reason for cancellation (optional)
                        </label>
                        <textarea
                            style={styles.textarea}
                            id="cancelReason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Let us know why you're cancelling (optional)"
                            disabled={isProcessing}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="bg-yellow-900 border border-yellow-600 rounded p-3 mb-4">
                        <p className="text-yellow-200 text-sm">
                            <strong>Please note:</strong> This action cannot be undone. You will receive a cancellation confirmation email.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            style={{ 
                                ...styles.button, 
                                ...styles.dangerButton,
                                ...(isProcessing ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                            }}
                            onClick={handleCancelBooking}
                            disabled={isProcessing}
                            className="hover:bg-red-700"
                        >
                            {isProcessing ? "Cancelling..." : "Confirm Cancellation"}
                        </button>
                        
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={() => setView("details")}
                            disabled={isProcessing}
                            className="hover:bg-gray-600"
                        >
                            Keep Booking
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderRescheduleView = () => {
        if (!booking) return null;

        const timeSlots = availableSlots.length > 0 ? 
            generateTimeSlots(availableSlots, booking.duration_minutes) : [];

        return (
            <div>
                {/* Header */}
                <div style={styles.card}>
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-white text-xl font-bold">
                            Reschedule Booking
                        </h1>
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={() => setView("details")}
                            className="hover:bg-gray-600"
                        >
                            ← Back
                        </button>
                    </div>
                </div>

                {/* Current Booking Info */}
                <div style={styles.card}>
                    <h3 className="text-white text-md font-medium mb-2">Current Booking</h3>
                    <p className="text-gray-300 text-sm mb-4">
                        {getServiceDisplayName(booking.service_type)} on{" "}
                        {format(new Date(booking.start_time), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </p>
                </div>

                {/* New Date Selection */}
                <div style={styles.card}>
                    <label style={styles.label} htmlFor="newDate">
                        Select New Date
                    </label>
                    <input
                        style={styles.input}
                        type="date"
                        id="newDate"
                        value={newDate ? format(newDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                            const date = new Date(e.target.value);
                            setNewDate(date);
                            fetchAvailableSlots(date);
                            setSelectedTimeSlot("");
                        }}
                        min={format(new Date(), "yyyy-MM-dd")}
                        disabled={isProcessing}
                    />

                    {/* Time Selection */}
                    {newDate && (
                        <div>
                            <label style={styles.label} htmlFor="timeSlot">
                                Select New Time
                            </label>
                            
                            {loadingSlots ? (
                                <div className="text-center py-4">
                                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                    <p className="text-gray-400 text-sm">Loading available times...</p>
                                </div>
                            ) : timeSlots.length > 0 ? (
                                <select
                                    style={styles.input}
                                    id="timeSlot"
                                    value={selectedTimeSlot}
                                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                                    disabled={isProcessing}
                                >
                                    <option value="">Select a time</option>
                                    {timeSlots.map((slot) => (
                                        <option key={slot} value={slot}>
                                            {slot}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-center py-4 text-gray-400">
                                    No available time slots for this date.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {newDate && selectedTimeSlot && (
                    <div style={styles.card}>
                        {error && (
                            <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                style={{ 
                                    ...styles.button, 
                                    ...styles.primaryButton,
                                    ...(isProcessing ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                                }}
                                onClick={handleRescheduleBooking}
                                disabled={isProcessing}
                                className="hover:bg-blue-600"
                            >
                                {isProcessing ? "Rescheduling..." : "Confirm Reschedule"}
                            </button>
                            
                            <button
                                style={{ ...styles.button, ...styles.secondaryButton }}
                                onClick={() => setView("details")}
                                disabled={isProcessing}
                                className="hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
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
                        <p className="text-gray-400">Loading booking details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !booking) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div className="text-center py-8">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={onBack}
                            className="hover:bg-gray-600"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {view === "details" && renderDetailsView()}
            {view === "cancel" && renderCancelView()}
            {view === "reschedule" && renderRescheduleView()}
        </div>
    );
}