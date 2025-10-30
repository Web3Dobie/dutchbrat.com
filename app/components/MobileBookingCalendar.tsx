"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import BookingForm from "./BookingForm";

// Import new focused components (we'll build these next)
import ServiceSelector from "./ServiceSelector";
import ResponsiveDatePicker from "./ResponsiveDatePicker";
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

    // --- Data Fetching (same API contract) ---
    useEffect(() => {
        if (!selectedDay) return;

        const formattedDate = format(selectedDay, "yyyy-MM-dd");
        const url = `/api/dog-walking/availability?date=${formattedDate}`;

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
    }, [selectedDay]);

    // --- Event Handlers ---
    const handleServiceChange = (serviceId: ServiceId) => {
        setSelectedServiceId(serviceId);
        setView("picker");
    };

    const handleTimeSlotSelect = (startTime: Date, endTime: Date) => {
        setSelectedBookingStart(startTime);
        setSelectedBookingEnd(endTime);
        setView("form");
    };

    const handleBookingSuccess = () => {
        setView("success");
    };

    const handleBackToPicker = () => {
        setView("picker");
        setSelectedBookingStart(null);
        setSelectedBookingEnd(null);
    };

    const handleBookAnother = () => {
        setView("picker");
        setSelectedBookingStart(null);
        setSelectedBookingEnd(null);
        setSelectedDay(new Date());
    };

    // --- Get current service info ---
    const selectedService = SERVICES.find(s => s.id === selectedServiceId);
    const selectedServiceName = selectedService?.name || "Service";

    // --- Render Views ---
    if (view === "success") {
        return (
            <BookingSuccess
                serviceName={selectedServiceName}
                bookingStart={selectedBookingStart}
                onBookAnother={handleBookAnother}
            />
        );
    }

    if (view === "form" && selectedBookingStart && selectedBookingEnd) {
        return (
            <BookingForm
                serviceName={selectedServiceName}
                startTime={selectedBookingStart}
                endTime={selectedBookingEnd}
                onBookingSuccess={handleBookingSuccess}
                onCancel={handleBackToPicker}
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

                {/* Step 2: Date Selection */}
                <ResponsiveDatePicker
                    selectedDay={selectedDay}
                    onDaySelect={setSelectedDay}
                />

                {/* Step 3: Time Selection */}
                <div className="min-h-[200px]">
                    {error && (
                        <div className="p-4 bg-red-900 border border-red-600 rounded-lg text-red-200 mb-4">
                            {error}
                        </div>
                    )}

                    {!selectedDay && (
                        <div className="p-6 text-center text-gray-400">
                            Please select a date to see available times.
                        </div>
                    )}

                    {selectedServiceId === "sitting" ? (
                        <SittingBookingFlow
                            selectedDay={selectedDay}
                            apiRanges={apiRanges}
                            isLoading={isLoading}
                            onTimeSlotSelect={handleTimeSlotSelect}
                        />
                    ) : (
                        <TimeSlotGrid
                            selectedService={selectedService}
                            selectedDay={selectedDay}
                            apiRanges={apiRanges}
                            isLoading={isLoading}
                            onTimeSlotSelect={handleTimeSlotSelect}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}