"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import BookingForm from "./BookingForm";

// Import components
import ServiceSelector from "./ServiceSelector";
import ResponsiveDatePicker from "./ResponsiveDatePicker"; // <-- NOW USING NEW FILE
import TimeSlotGrid from "./TimeSlotGrid";
import SittingBookingFlow from "./SittingBookingFlow";
import BookingSuccess from "./BookingSuccess";

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

// --- Service Definitions (kept from original) ---
export const SERVICES = [
    { id: "meetgreet", name: "Meet & Greet - for new clients", duration: 30 },
    { id: "solo", name: "Solo Walk (60 min)", duration: 60 },
    { id: "quick", name: "Quick Walk (30 min)", duration: 30 },
    { id: "sitting", name: "Dog Sitting (Variable)", duration: null },
] as const;

// --- Main Mobile-First Component ---
export default function MobileBookingCalendar() {
    // --- Core State (simplified from original) ---
    const [view, setView] = useState<ViewState>("picker");
    const [selectedServiceId, setSelectedServiceId] = useState<ServiceId>("solo");
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

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
        console.log("API Call Debug:", { selectedServiceId, serviceType, formattedDate });
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
    }, [selectedDay, selectedServiceId]); // Added selectedServiceId to dependencies

    // --- Service Change Handler ---
    const handleServiceChange = (serviceId: ServiceId) => {
        console.log("Service changing from", selectedServiceId, "to", serviceId);
        setSelectedServiceId(serviceId);
        setSelectedBookingStart(null);
        setSelectedBookingEnd(null);
        setError(null);

        // For dog sitting, we don't need the main selectedDay since it has its own date selection
        if (serviceId === "sitting") {
            setSelectedDay(undefined);
            setApiRanges([]);
        } else if (!selectedDay) {
            setSelectedDay(new Date());
        }
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

    // --- View States ---
    if (view === "form" && selectedBookingStart && selectedBookingEnd && selectedService) {
        return (
            <BookingForm
                serviceName={selectedService.name}
                startTime={selectedBookingStart}
                endTime={selectedBookingEnd}
                onBookingSuccess={handleBookingSuccess}
                onCancel={handleBackToPicker}
            />
        );
    }

    if (view === "success") {
        return (
            <BookingSuccess
                serviceName={selectedService?.name || "Service"}
                bookingStart={selectedBookingStart}     // ✅ Fixed: Changed from startTime to bookingStart
                endTime={selectedBookingEnd}            // ✅ Optional prop for multi-day support
                onBookAnother={handleBackToPicker}      // ✅ Fixed: Changed from onBackToPicker to onBookAnother
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
                            <h2 className="text-xl font-semibold text-white">3. Select Time</h2>

                            {!selectedDay && (
                                <div className="p-6 text-center text-gray-400">
                                    Please select a date to see available times.
                                </div>
                            )}

                            {selectedDay && (
                                <TimeSlotGrid
                                    selectedService={selectedService}
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
