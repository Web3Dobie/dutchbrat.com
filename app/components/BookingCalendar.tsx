"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
    format,
    parse,
    addMinutes,
    differenceInMinutes,
    isBefore,
    isEqual,
    isAfter,
    isSameDay,
} from "date-fns";
import BookingForm from "./BookingForm"; // Import the smart form

// --- Types ---
type ApiRange = {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
};
type AvailabilityResponse = {
    availableRanges: ApiRange[];
};

// --- Service Definitions ---
const SERVICES = [
    { id: "meetgreet", name: "Meet & Greet - for new clients", duration: 30 },
    { id: "solo", name: "Solo Walk (60 min)", duration: 60 },
    { id: "quick", name: "Quick Walk (30 min)", duration: 30 },
    { id: "sitting", name: "Dog Sitting (Variable)", duration: null },
];
type ServiceId = "meetgreet" | "solo" | "quick" | "sitting";

// --- Helper Functions (Unchanged) ---
const parseTime = (timeStr: string): Date => {
    return parse(timeStr, "HH:mm", new Date());
};

const generateWalkSlots = (ranges: ApiRange[], duration: number): string[] => {
    const slots: string[] = [];
    for (const range of ranges) {
        let currentSlot = parseTime(range.start);
        const end = parseTime(range.end);
        while (isBefore(addMinutes(currentSlot, duration), end) || isEqual(addMinutes(currentSlot, duration), end)) {
            slots.push(format(currentSlot, "HH:mm"));
            currentSlot = addMinutes(currentSlot, 30);
        }
    }
    return slots;
};

const getSittingStartTimes = (ranges: ApiRange[]): string[] => {
    const slots: string[] = [];
    const minDuration = 60;
    for (const range of ranges) {
        let currentSlot = parseTime(range.start);
        const end = parseTime(range.end);
        while (isBefore(addMinutes(currentSlot, minDuration), end) || isEqual(addMinutes(currentSlot, minDuration), end)) {
            slots.push(format(currentSlot, "HH:mm"));
            currentSlot = addMinutes(currentSlot, 30);
        }
    }
    return slots;
};

// --- The Component ---
export default function BookingCalendar() {
    // --- State ---
    const [selectedServiceId, setSelectedServiceId] = useState<ServiceId>("solo");
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

    // State for Dog Sitting
    const [sittingStartTime, setSittingStartTime] = useState<string>("");
    const [sittingDuration, setSittingDuration] = useState<number>(60);

    // State for API data
    const [apiRanges, setApiRanges] = useState<ApiRange[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for Booking Flow
    type ViewState = "picker" | "form" | "success";
    const [view, setView] = useState<ViewState>("picker");
    const [selectedBookingStart, setSelectedBookingStart] = useState<Date | null>(null);
    const [selectedBookingEnd, setSelectedBookingEnd] = useState<Date | null>(null);

    // --- Data Fetching ---
    useEffect(() => {
        if (!selectedDay) return;

        // Use the new, organized API path
        const formattedDate = format(selectedDay, "yyyy-MM-dd");
        const url = `/api/dog-walking/availability?date=${formattedDate}`;

        setIsLoading(true);
        setError(null);
        setApiRanges([]);
        setSittingStartTime("");

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
    const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedServiceId(e.target.value as ServiceId);
        setSittingStartTime("");
        setView("picker"); // Reset view on service change
    };

    const handleSittingStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSittingStartTime(e.target.value);
    };

    const handleSittingDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSittingDuration(parseInt(e.target.value, 10));
    };

    const createFullDate = (timeStr: string): Date | null => {
        if (!selectedDay) return null;
        const year = selectedDay.getFullYear();
        const month = selectedDay.getMonth();
        const day = selectedDay.getDate();
        const [hours, minutes] = timeStr.split(":").map(Number);
        return new Date(year, month, day, hours, minutes);
    };

    const handleWalkSlotClick = (slot: string) => {
        const service = SERVICES.find(s => s.id === selectedServiceId);
        if (!service || !service.duration) return;

        const startTime = createFullDate(slot);
        if (!startTime) return;

        const endTime = addMinutes(startTime, service.duration);

        setSelectedBookingStart(startTime);
        setSelectedBookingEnd(endTime);
        setView("form");
    };

    const handleSittingBookClick = () => {
        if (!sittingStartTime || !sittingDuration) return;

        const startTime = createFullDate(sittingStartTime);
        if (!startTime) return;

        const endTime = addMinutes(startTime, sittingDuration);

        setSelectedBookingStart(startTime);
        setSelectedBookingEnd(endTime);
        setView("form");
    };

    const handleBookingSuccess = () => {
        setView("success");
    };

    const handleFormCancel = () => {
        setView("picker");
        setSelectedBookingStart(null);
        setSelectedBookingEnd(null);
    };

    const resetAndBookAnother = () => {
        setView("picker");
        setSelectedBookingStart(null);
        setSelectedBookingEnd(null);
        setSelectedDay(new Date());
    };

    // --- Memoized Calculations (Fully Expanded) ---

    const walkSlots = useMemo(() => {

        const service = SERVICES.find((s) => s.id === selectedServiceId);

        if (selectedServiceId === "sitting" || !service || !service.duration) {
            console.log("Early return - sitting:", selectedServiceId === "sitting");
            console.log("Early return - no service:", !service);
            console.log("Early return - no duration:", !service?.duration);
            return [];
        }

        const generatedSlots = generateWalkSlots(apiRanges, service.duration);

        // Filter past slots for today
        const now = new Date();
        const isToday = selectedDay ? isSameDay(selectedDay, now) : false;
        console.log("Is today:", isToday);

        if (isToday) {
            const filteredSlots = generatedSlots.filter(slot => isAfter(parseTime(slot), now));
            console.log("Filtered slots for today:", filteredSlots);
            return filteredSlots;
        }

        console.log("Final slots:", generatedSlots);
        return generatedSlots;
    }, [apiRanges, selectedServiceId, selectedDay]);

    const sittingStartTimes = useMemo(() => {
        if (selectedServiceId !== "sitting") return [];

        const generatedStartTimes = getSittingStartTimes(apiRanges);

        // Filter past slots for today
        const now = new Date();
        const isToday = selectedDay ? isSameDay(selectedDay, now) : false;

        if (isToday) {
            return generatedStartTimes.filter(slot => isAfter(parseTime(slot), now));
        }
        return generatedStartTimes;
    }, [apiRanges, selectedServiceId, selectedDay]);

    const sittingDurations = useMemo(() => {
        if (selectedServiceId !== "sitting" || !sittingStartTime) return [];

        const startTime = parseTime(sittingStartTime);
        const relevantRange = apiRanges.find(range => {
            const start = parseTime(range.start);
            const end = parseTime(range.end);
            return (isEqual(startTime, start) || isAfter(startTime, start)) && isBefore(startTime, end);
        });

        if (!relevantRange) return [];

        const maxDuration = differenceInMinutes(parseTime(relevantRange.end), startTime);
        const durations: { label: string; value: number }[] = [];

        for (let duration = 60; duration <= maxDuration; duration += 30) {
            const hours = duration / 60;
            const label = `${hours} hour${hours !== 1 ? 's' : ''}`;
            durations.push({ label, value: duration });
        }
        return durations;
    }, [sittingStartTime, apiRanges, selectedServiceId]);

    // --- Render ---

    // Disables past days and weekends
    const disabledDays = [
        { before: new Date() },
        { dayOfWeek: [0, 6] }
    ];

    const selectedServiceName = SERVICES.find(s => s.id === selectedServiceId)?.name || "Service";

    // View for "Booking Success"
    if (view === "success") {
        return (
            <section style={{ maxWidth: "500px", textAlign: "center" }}>
                <h2 style={{ color: "#10b981" }}>Booking Confirmed!</h2>
                <p>Thank you for booking. You will receive a confirmation email shortly with all the details.</p>

                <p>
                    Your <strong>{selectedServiceName}</strong> on {" "}
                    <strong>{selectedBookingStart && format(selectedBookingStart, "EEEE, MMMM d")}</strong> at {" "}
                    <strong>{selectedBookingStart && format(selectedBookingStart, "HH:mm")}</strong> is complete.
                </p>

                {/* NEW: Spam folder note */}
                <div style={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #f59e0b",
                    borderRadius: "6px",
                    padding: "12px",
                    marginTop: "16px",
                    fontSize: "0.9rem"
                }}>
                    <p style={{ margin: "0", color: "#92400e" }}>
                        📧 <strong>Email Tip:</strong> If you don't see your confirmation email within a few minutes,
                        please check your spam/junk folder and mark it as "not spam" for future emails.
                    </p>
                </div>

                <button
                    style={{ marginTop: "16px", padding: "8px 12px", cursor: "pointer", fontSize: "1rem" }}
                    onClick={resetAndBookAnother}
                >
                    Book Another
                </button>
            </section>
        );
    }

    // View for "Booking Form"
    if (view === "form" && selectedBookingStart && selectedBookingEnd) {
        return (
            <BookingForm
                serviceName={selectedServiceName}
                startTime={selectedBookingStart}
                endTime={selectedBookingEnd}
                onBookingSuccess={handleBookingSuccess}
                onCancel={handleFormCancel}
            />
        );
    }

    // DEFAULT: View for "Picker" (Calendar & Slots)
    return (
        <section style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px", maxWidth: "800px" }}>

            {/* COLUMN 1: Service & Date */}
            <div>
                <h3>1. Select Service</h3>
                <select
                    onChange={handleServiceChange}
                    value={selectedServiceId}
                    style={{ fontSize: "1rem", padding: "8px", width: "100%", color: "#333", backgroundColor: "#fff" }}
                >
                    {SERVICES.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>

                <h3 style={{ marginTop: "1.5rem" }}>2. Select Date</h3>
                <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={setSelectedDay}
                    disabled={disabledDays}
                    showOutsideDays
                    fixedWeeks
                />
            </div>

            {/* COLUMN 2: Time Slots */}
            <div>
                <h3>3. Select Time</h3>
                <div style={{ minHeight: "200px" }}>
                    {!selectedDay && <p>Please select a date.</p>}
                    {isLoading && <p>Loading availability...</p>}
                    {error && <p style={{ color: "red" }}>{error}</p>}
                    {!isLoading && !error && selectedDay && apiRanges.length === 0 && (
                        <p>No availability for this day. Please try another.</p>
                    )}

                    {/* RENDER WALK SLOTS */}
                    {apiRanges.length > 0 && (selectedServiceId === 'solo' || selectedServiceId === 'quick' || selectedServiceId === 'meetgreet') && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {walkSlots.length > 0 ? (
                                walkSlots.map((slot) => (
                                    <button
                                        key={slot}
                                        style={{ padding: "8px 12px", fontSize: "1rem", cursor: "pointer" }}
                                        onClick={() => handleWalkSlotClick(slot)}
                                    >
                                        {slot}
                                    </button>
                                ))
                            ) : (
                                <p>No slots available. Please try another service or day.</p>
                            )}
                        </div>
                    )}

                    {/* RENDER DOG SITTING SLOTS */}
                    {apiRanges.length > 0 && selectedServiceId === 'sitting' && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {sittingStartTimes.length > 0 ? (
                                <>
                                    {/* Start Time Dropdown */}
                                    <div>
                                        <label htmlFor="start-time" style={{ display: "block", marginBottom: "4px" }}>Start Time</label>
                                        <select
                                            id="start-time"
                                            onChange={handleSittingStartChange}
                                            value={sittingStartTime}
                                            style={{ fontSize: "1rem", padding: "8px", width: "100%", color: "#333", backgroundColor: "#fff" }}
                                        >
                                            <option value="" disabled>Select a start time</option>
                                            {sittingStartTimes.map((time) => (
                                                <option key={time} value={time}>{time}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Duration Dropdown */}
                                    {sittingStartTime && (
                                        <div>
                                            <label htmlFor="duration" style={{ display: "block", marginBottom: "4px" }}>Duration</label>
                                            <select
                                                id="duration"
                                                onChange={handleSittingDurationChange}
                                                value={sittingDuration}
                                                style={{ fontSize: "1rem", padding: "8px", width: "100%", color: "#333", backgroundColor: "#fff" }}
                                            >
                                                {sittingDurations.map((dur) => (
                                                    <option key={dur.value} value={dur.value}>{dur.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Book Button for Sitting */}
                                    {sittingStartTime && (
                                        <button
                                            style={{ padding: "12px", fontSize: "1rem", fontWeight: "bold", color: "#fff", backgroundColor: "#3b82f6", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                            onClick={handleSittingBookClick}
                                        >
                                            Book Dog Sitting
                                        </button>
                                    )}
                                </>
                            ) : (
                                <p>No ranges long enough for the 1-hour minimum. Please try another day.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}