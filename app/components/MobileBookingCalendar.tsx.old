"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import BookingForm from "./BookingForm";

// Import components
import ServiceSelector from "./ServiceSelector";
import ResponsiveDatePicker from "./ResponsiveDatePicker";
import TimeSlotGrid from "./TimeSlotGrid";
import SittingBookingFlow from "./SittingBookingFlow";
import BookingSuccess from "./BookingSuccess";
import SoloWalkDurationSelector from "./SoloWalkDurationSelector"; // NEW: Duration selector

// --- Types (kept from original) ---
type ApiRange = {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
};

type AvailabilityResponse = {
    availableRanges: ApiRange[];
};

type ServiceId = "meetgreet" | "solo" | "quick" | "sitting";
type ViewState = "picker" | "form" | "success";

// --- Updated Service Definitions ---
export const SERVICES = [
    { id: "meetgreet", name: "Meet & Greet - for new clients", duration: 30 },
    { id: "solo", name: "Solo Walk", duration: null }, // ← UPDATED: Remove hardcoded duration
    { id: "quick", name: "Quick Walk (30 min)", duration: 30 },
    { id: "sitting", name: "Dog Sitting (Variable)", duration: null },
] as const;

// --- Main Mobile-First Component ---
export default function MobileBookingCalendar() {
    // --- Core State (simplified from original) ---
    const [view, setView] = useState<ViewState>("picker");
    const [selectedServiceId, setSelectedServiceId] = useState<ServiceId>("solo");
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

    // --- NEW: Duration State for Solo Walks ---
    const [selectedDuration, setSelectedDuration] = useState<number>(60); // Default: 1 hour

    // --- Booking State ---
    const [selectedBookingStart, setSelectedBookingStart] = useState<Date | null>(null);
    const [selectedBookingEnd, setSelectedBookingEnd] = useState<Date | null>(null);

    // --- API State ---
    const [apiRanges, setApiRanges] = useState<ApiRange[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching (Only for walk services, dog sitting has its own API) ---
    useEffect(() => {
        // Skip API calls for dog sitting - it manages its own API calls
        if (selectedServiceId === "sitting") return;
        if (!selectedDay) return;

        const formattedDate = format(selectedDay, "yyyy-MM-dd");

        // Map frontend service ID to backend service type (dog sitting excluded)
        const serviceTypeMap: Record<Exclude<ServiceId, 'sitting'>, string> = {
            'meetgreet': 'meet-greet',
            'solo': 'solo-walk',
            'quick': 'quick-walk',
        };

        const serviceType = serviceTypeMap[selectedServiceId as Exclude<ServiceId, 'sitting'>];
        console.log("API Call Debug:", { selectedServiceId, serviceType, formattedDate, selectedDuration });
        const url = `/api/dog-walking/availability?date=${formattedDate}&service_type=${serviceType}`;

        setIsLoading(true);
        setError(null);
        setApiRanges([]);

        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch data");
                return res.json();
            })
            .then((data: AvailabilityResponse) => {
                setApiRanges(data.availableRanges || []);
            })
            .catch((err) => {
                console.error(err);
                setError("Could not load availability. Please try again.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [selectedDay, selectedServiceId]); // Note: Don't include selectedDuration in deps since it doesn't affect availability

    // --- Service Change Handler ---
    const handleServiceChange = (serviceId: ServiceId) => {
        console.log("Service changing from", selectedServiceId, "to", serviceId);
        setSelectedServiceId(serviceId);
        setSelectedBookingStart(null);
        setSelectedBookingEnd(null);
        setError(null);

        // Reset duration when changing away from solo walk
        if (serviceId !== "solo") {
            setSelectedDuration(60); // Reset to default
        }

        // For dog sitting, we don't need the main selectedDay since it has its own date selection
        if (serviceId === "sitting") {
            setSelectedDay(undefined);
            setApiRanges([]);
        } else if (!selectedDay) {
            setSelectedDay(new Date());
        }
    };

    // --- NEW: Duration Change Handler ---
    const handleDurationChange = (duration: number) => {
        console.log("Duration changing to:", duration);
        setSelectedDuration(duration);
        // Reset time selection when duration changes
        setSelectedBookingStart(null);
        setSelectedBookingEnd(null);
    };

    // --- Time Slot Selection Handler ---
    const handleTimeSlotSelect = (startTime: Date, endTime: Date) => {
        setSelectedBookingStart(startTime);
        setSelectedBookingEnd(endTime);
        setView("form");
    };

    // --- Success Handler ---
    const handleBookingSuccess = () => {
        setView("success");
    };

    // --- Reset to Picker ---
    const handleBackToPicker = () => {
        setView("picker");
        setSelectedBookingStart(null);
        setSelectedBookingEnd(null);
        setError(null);
    };

    // --- Get Selected Service ---
    const selectedService = SERVICES.find(s => s.id === selectedServiceId);

    // --- NEW: Build Service Name with Duration (for solo walks) ---
    const getServiceNameWithDuration = () => {
        if (selectedServiceId === "solo") {
            const hourDisplay = selectedDuration === 60 ? "1 hour" : "2 hours";
            return `Solo Walk (${hourDisplay})`;
        }
        return selectedService?.name || "Service";
    };

    // --- View States ---
    if (view === "form" && selectedBookingStart && selectedBookingEnd && selectedService) {
        return (
            <BookingForm
                serviceName={getServiceNameWithDuration()} // ← UPDATED: Include duration
                startTime={selectedBookingStart}
                endTime={selectedBookingEnd}
                selectedDuration={selectedDuration} // ← NEW: Pass duration to BookingForm
                onBookingSuccess={handleBookingSuccess}
                onCancel={handleBackToPicker}
            />
        );
    }

    if (view === "success") {
        return (
            <BookingSuccess
                serviceName={getServiceNameWithDuration()} // ← UPDATED: Include duration
                bookingStart={selectedBookingStart}
                endTime={selectedBookingEnd}
                onBookAnother={handleBackToPicker}
            />
        );
    }

    // --- Main Picker View (Mobile-First Layout) ---
    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Mobile: Single column stack, Desktop: Multi-column */}
            <div className="space-y-6 lg:space-y-8">

                {/* Step 1: Service Selection */}
                <ServiceSelector
                    selectedServiceId={selectedServiceId}
                    onServiceChange={handleServiceChange}
                />

                {/* Step 1.5: Duration Selection (Only for Solo Walks) - NEW SECTION */}
                {selectedServiceId === "solo" && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                        <SoloWalkDurationSelector
                            selectedDuration={selectedDuration}
                            dogCount={1} // Default to 1 dog for price display - will be corrected in BookingForm
                            onDurationChange={handleDurationChange}
                        />
                    </div>
                )}

                {/* Step 2: Date Selection - HIDDEN for Dog Sitting */}
                {selectedServiceId !== "sitting" && (
                    <div className="space-y-4">
                        <ResponsiveDatePicker
                            selectedDay={selectedDay}
                            onDaySelect={setSelectedDay}
                        />
                    </div>
                )}

                {/* Step 3: Time Selection / Dog Sitting Details */}
                <div className="min-h-[200px]">
                    {error && (
                        <div className="p-4 bg-red-900 border border-red-600 rounded-lg text-red-200 mb-4">
                            {error}
                        </div>
                    )}

                    {selectedServiceId === "sitting" ? (
                        <SittingBookingFlow
                            selectedDay={selectedDay}
                            onTimeSlotSelect={handleTimeSlotSelect}
                        />
                    ) : (
                        <>
                            <h2 className="text-xl font-semibold text-white">
                                {selectedServiceId === "solo" ? "3. Select Time" : "3. Select Time"}
                            </h2>

                            {!selectedDay && (
                                <div className="p-6 text-center text-gray-400">
                                    Please select a date to see available times.
                                </div>
                            )}

                            {selectedDay && (
                                <TimeSlotGrid
                                    selectedService={{
                                        ...selectedService!,
                                        duration: selectedServiceId === "solo" ? selectedDuration : selectedService!.duration
                                    }} // ← UPDATED: Pass actual duration for solo walks
                                    selectedDay={selectedDay}
                                    apiRanges={apiRanges}
                                    isLoading={isLoading}
                                    onTimeSlotSelect={handleTimeSlotSelect}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}