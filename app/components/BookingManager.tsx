"use client";

import React, { useState, useEffect } from "react";
import { format, isPast, isToday, isTomorrow, addHours, isBefore, addMinutes } from "date-fns";

// Import existing calendar components
import ResponsiveDatePicker from "./ResponsiveDatePicker";
import TimeSlotGrid from "./TimeSlotGrid";

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

interface Service {
    id: string;
    name: string;
    duration: number | null;
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
    
    // Reschedule specific state - using correct TimeSlotGrid interface
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
    const [apiRanges, setApiRanges] = useState<ApiRange[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
    const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);

    // --- Effects ---
    useEffect(() => {
        fetchBookingDetails();
    }, [bookingId]);

    // Fetch available slots when date changes (for reschedule)
    useEffect(() => {
        if (view === "reschedule" && selectedDay && booking) {
            fetchAvailableSlots();
        }
    }, [selectedDay, view, booking]);

    // --- API Functions ---
    const fetchBookingDetails = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/dog-walking/booking-details?id=${bookingId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch booking details");
            }
            
            setBooking(data.booking);
        } catch (err: any) {
            console.error("Failed to fetch booking details:", err);
            setError(err.message || "Could not load booking details. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableSlots = async () => {
        if (!selectedDay || !booking) return;
        
        setLoadingSlots(true);
        setError(null);
        
        try {
            const formattedDate = format(selectedDay, "yyyy-MM-dd");
            
            // Map service type for API call
            const serviceTypeMap: Record<string, string> = {
                'meetgreet': 'meet-greet',
                'solo': 'solo-walk', 
                'quick': 'quick-walk',
                'sitting': 'dog-sitting',
            };
            
            const serviceType = serviceTypeMap[booking.service_type] || booking.service_type;
            const url = `/api/dog-walking/availability?date=${formattedDate}&service_type=${serviceType}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error("Failed to fetch availability");
            }
            
            const data = await response.json();
            setApiRanges(data.availableRanges || []);
            setSelectedStartTime(null); // Reset time selection
            setSelectedEndTime(null);
            
        } catch (err: any) {
            console.error("Failed to fetch available slots:", err);
            setError("Could not load available times. Please try again.");
            setApiRanges([]);
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
            const response = await fetch("/api/dog-walking/cancel", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    bookingId: booking.id,
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
        if (!booking || !selectedStartTime || !selectedEndTime) return;

        setIsProcessing(true);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/reschedule-booking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    booking_id: booking.id,
                    new_start_time: selectedStartTime.toISOString(),
                    new_end_time: selectedEndTime.toISOString(),
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

    const handleTimeSlotSelect = (startTime: Date, endTime: Date) => {
        setSelectedStartTime(startTime);
        setSelectedEndTime(endTime);
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

    // Create a Service object for TimeSlotGrid
    const createServiceFromBooking = (booking: BookingDetails): Service => {
        return {
            id: booking.service_type,
            name: getServiceDisplayName(booking.service_type),
            duration: booking.duration_minutes
        };
    };

    // --- Style Constants ---
    const styles = {
        card: {
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '16px',
        },
        button: {
            padding: '12px 24px',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
        },
        primaryButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
        },
        dangerButton: {
            backgroundColor: '#dc2626',
            color: 'white',
        },
        secondaryButton: {
            backgroundColor: '#6b7280',
            color: 'white',
        },
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Date:</span>
                            <span className="text-white font-medium ml-2">
                                {format(startTime, "EEEE, MMMM d, yyyy")}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Time:</span>
                            <span className="text-white font-medium ml-2">
                                {format(startTime, "h:mm a")}
                                {endTime && ` - ${format(endTime, "h:mm a")}`}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white font-medium ml-2">
                                {booking.duration_minutes} minutes
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Dogs:</span>
                            <span className="text-white font-medium ml-2">
                                {booking.dogs.map(dog => dog.dog_name).join(", ")}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Status:</span>
                            <span className="text-green-400 font-medium ml-2 capitalize">
                                {booking.status}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Booked:</span>
                            <span className="text-white font-medium ml-2">
                                {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
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
                        
                        {!canCancelBooking() && (
                            <p className="text-gray-400 text-sm">
                                Bookings can only be modified more than 2 hours before the start time.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderRescheduleView = () => {
        if (!booking) return null;

        const selectedService = createServiceFromBooking(booking);

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

                {/* New Date Selection - Using Calendar Interface */}
                <div style={styles.card}>
                    <h3 className="text-white text-md font-medium mb-4">Select New Date</h3>
                    
                    <ResponsiveDatePicker
                        selectedDay={selectedDay}
                        onDaySelect={setSelectedDay}
                    />
                </div>

                {/* Time Selection - Using TimeSlotGrid with correct props */}
                {selectedDay && (
                    <div style={styles.card}>
                        <h3 className="text-white text-md font-medium mb-4">Select New Time</h3>
                        
                        <TimeSlotGrid
                            selectedService={selectedService}
                            selectedDay={selectedDay}
                            apiRanges={apiRanges}
                            isLoading={loadingSlots}
                            onTimeSlotSelect={handleTimeSlotSelect}
                        />
                    </div>
                )}

                {/* Confirm Reschedule */}
                {selectedDay && selectedStartTime && selectedEndTime && (
                    <div style={styles.card}>
                        {error && (
                            <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="mb-4 p-4 bg-blue-900 border border-blue-600 rounded">
                            <p className="text-blue-200 font-medium">New Booking Time:</p>
                            <p className="text-white text-lg">
                                {format(selectedDay, "EEEE, MMMM d, yyyy")} at {format(selectedStartTime, "h:mm a")}
                                {selectedEndTime && ` - ${format(selectedEndTime, "h:mm a")}`}
                            </p>
                        </div>

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

                {/* Confirmation */}
                <div style={styles.card}>
                    <h3 className="text-white text-md font-medium mb-4">
                        Cancel: {getServiceDisplayName(booking.service_type)}
                    </h3>
                    
                    <p className="text-gray-300 mb-4">
                        {format(new Date(booking.start_time), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-6 p-4 bg-yellow-900 border border-yellow-600 rounded">
                        <p className="text-yellow-200 font-medium">Please note:</p>
                        <p className="text-yellow-100 text-sm">
                            This action cannot be undone. You will receive a cancellation confirmation email.
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

    // --- Main Render ---
    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading booking details...</p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div style={styles.card}>
                <div className="text-center py-8">
                    <p className="text-red-400 font-medium mb-4">Booking not found</p>
                    <button
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={onBack}
                        className="hover:bg-gray-600"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Render based on current view
    switch (view) {
        case "details":
            return renderDetailsView();
        case "reschedule":
            return renderRescheduleView();
        case "cancel":
            return renderCancelView();
        default:
            return renderDetailsView();
    }
}