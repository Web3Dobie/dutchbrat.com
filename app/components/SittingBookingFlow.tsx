import React, { useState, useMemo, useEffect } from "react";
import { parse, addMinutes, format, differenceInMinutes, isBefore, isEqual, isAfter, isSameDay, differenceInDays, addDays } from "date-fns";
import { DayPicker } from "react-day-picker";
// NOTE: Styles are loaded via globals.css

// --- Types ---
type ApiRange = {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
};

interface SittingAvailabilityResponse {
    available: boolean;
    type: 'single' | 'multi';
    availableRanges?: ApiRange[];
    startDayRanges?: ApiRange[];
    endDayRanges?: ApiRange[];
    conflicts?: string[];
    conflictDetails?: string[];
    message?: string;
}

interface SittingBookingFlowProps {
    selectedDay: Date | undefined;
    onTimeSlotSelect: (startTime: Date, endTime: Date) => void;
}

// --- Helper Functions ---
const parseTime = (timeStr: string): Date => {
    return parse(timeStr, "HH:mm", new Date());
};

const getSittingStartTimes = (ranges: ApiRange[]): string[] => {
    if (ranges.length === 0) return [];

    // All available slots, regardless of range checks (for the full 24h day)
    const cleanSlots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
        cleanSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        cleanSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // Filter slots to ensure they fit within an available range for at least 60 minutes
    return cleanSlots.filter(slot => {
        const slotTimeInMinutes = parseTime(slot).getHours() * 60 + parseTime(slot).getMinutes();
        const minEndTimeInMinutes = slotTimeInMinutes + 60; // 1 hour minimum

        return ranges.some(range => {
            const rangeStartInMinutes = parseTime(range.start).getHours() * 60 + parseTime(range.start).getMinutes();
            const rangeEndInMinutes = parseTime(range.end).getHours() * 60 + parseTime(range.end).getMinutes();

            // Check for ranges that cross midnight (e.g., 22:00 to 02:00)
            if (rangeEndInMinutes <= rangeStartInMinutes) {
                // Case 1: Start time is in the evening part (before midnight)
                const fitsEvening = slotTimeInMinutes >= rangeStartInMinutes && minEndTimeInMinutes <= 24 * 60;
                // Case 2: Start time is in the morning part (after midnight)
                const fitsMorning = slotTimeInMinutes < rangeEndInMinutes && minEndTimeInMinutes <= rangeEndInMinutes;

                return fitsEvening || fitsMorning;
            } else {
                // Normal range (within same day)
                const startsAfterRangeStart = slotTimeInMinutes >= rangeStartInMinutes;
                const endsBeforeRangeEnd = minEndTimeInMinutes <= rangeEndInMinutes;
                return startsAfterRangeStart && endsBeforeRangeEnd;
            }
        });
    });
};

// Function to get available end times for a given start time
const getSittingEndTimes = (ranges: ApiRange[], startTime: string): string[] => {
    if (ranges.length === 0) return [];

    const slots: string[] = [];
    const startTimeObj = parseTime(startTime);
    const startTimeInMinutes = startTimeObj.getHours() * 60 + startTimeObj.getMinutes();
    const minEndTimeInMinutes = startTimeInMinutes + 60; // 1 hour minimum

    // Find the single relevant range that contains the start time
    const relevantRange = ranges.find(range => {
        const rangeStartInMinutes = parseTime(range.start).getHours() * 60 + parseTime(range.start).getMinutes();
        const rangeEndInMinutes = parseTime(range.end).getHours() * 60 + parseTime(range.end).getMinutes();

        if (rangeEndInMinutes <= rangeStartInMinutes) {
            // Range crosses midnight
            return startTimeInMinutes >= rangeStartInMinutes || startTimeInMinutes < rangeEndInMinutes;
        } else {
            // Normal range
            return startTimeInMinutes >= rangeStartInMinutes && startTimeInMinutes < rangeEndInMinutes;
        }
    });

    if (!relevantRange) return [];

    const rangeStartInMinutes = parseTime(relevantRange.start).getHours() * 60 + parseTime(relevantRange.start).getMinutes();
    const rangeEndInMinutes = parseTime(relevantRange.end).getHours() * 60 + parseTime(relevantRange.end).getMinutes();

    let currentSlotMinutes = minEndTimeInMinutes;

    while (true) {
        if (currentSlotMinutes >= 24 * 60 + 30) break; // Safety break beyond end of day

        const isWrappingRange = rangeEndInMinutes <= rangeStartInMinutes;
        let isWithinRange = false;

        if (isWrappingRange) {
            // If the range wraps (e.g. 22:00 to 02:00)
            if (currentSlotMinutes < rangeEndInMinutes) {
                // If the end time is in the next morning
                isWithinRange = true;
            } else if (currentSlotMinutes >= rangeStartInMinutes) {
                // If the end time is in the current evening (only possible if start time is 22:00-23:30)
                isWithinRange = true;
            } else if (currentSlotMinutes >= 24 * 60) {
                // If we've passed midnight and are in the next day's morning
                const wrappedCurrent = currentSlotMinutes % (24 * 60);
                isWithinRange = wrappedCurrent < rangeEndInMinutes;
            }
        } else {
            // Normal range (within same day)
            isWithinRange = currentSlotMinutes <= rangeEndInMinutes;
        }

        if (currentSlotMinutes > rangeEndInMinutes && !isWrappingRange) break;
        if (currentSlotMinutes > 24 * 60 && isWrappingRange && currentSlotMinutes % (24 * 60) >= rangeEndInMinutes) break;
        if (currentSlotMinutes >= 24 * 60 && !isWrappingRange) break;

        // Convert back to Date/Time string
        const displayTime = addMinutes(new Date(0, 0, 0, 0, 0), currentSlotMinutes % (24 * 60));
        slots.push(format(displayTime, "HH:mm"));

        currentSlotMinutes += 30; // 30-minute intervals
    }

    // Filter slots to be unique
    return Array.from(new Set(slots));
};


export default function SittingBookingFlow({
    selectedDay,
    onTimeSlotSelect
}: SittingBookingFlowProps) {

    // --- State for booking type and date selection ---
    const [startDate, setStartDate] = useState<Date | undefined>(selectedDay);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [selectedStartTime, setSelectedStartTime] = useState<string>("");
    const [selectedEndTime, setSelectedEndTime] = useState<string>("");

    // API state
    const [apiData, setApiData] = useState<SittingAvailabilityResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Multi-day state
    const [isMultiDay, setIsMultiDay] = useState<boolean>(false);

    // Auto-detect if this should be multi-day based on date selection
    useEffect(() => {
        // Reset times when dates change
        setSelectedStartTime("");
        setSelectedEndTime("");

        if (startDate && endDate && !isSameDay(startDate, endDate)) {
            setIsMultiDay(true);
            checkAvailability();
        } else if (startDate && (!endDate || isSameDay(startDate, endDate))) {
            setIsMultiDay(false);
            checkAvailability();
        } else {
            setIsMultiDay(false);
            setApiData(null);
        }
    }, [startDate, endDate]);

    // Check availability using the new API
    const checkAvailability = async () => {
        if (!startDate) return;

        setIsLoading(true);
        setError(null);
        setApiData(null);

        try {
            let url: string;

            if (isMultiDay && endDate) {
                // Multi-day query
                const startDateStr = format(startDate, 'yyyy-MM-dd');
                const endDateStr = format(endDate, 'yyyy-MM-dd');
                url = `/api/dog-walking/sitting-availability?type=multi&start_date=${startDateStr}&end_date=${endDateStr}`;
            } else {
                // Single day query
                const dateStr = format(startDate, 'yyyy-MM-dd');
                url = `/api/dog-walking/sitting-availability?type=single&date=${dateStr}`;
            }

            console.log('Fetching sitting availability:', url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: SittingAvailabilityResponse = await response.json();
            console.log('Sitting availability response:', data);
            setApiData(data);

        } catch (err) {
            console.error('Error fetching sitting availability:', err);
            setError('Failed to check availability. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Get available start times for single day
    const availableStartTimes = useMemo(() => {
        if (!apiData || apiData.type !== 'single' || !apiData.availableRanges) return [];
        return getSittingStartTimes(apiData.availableRanges);
    }, [apiData]);

    // Get available end times for selected start time
    const availableEndTimes = useMemo(() => {
        if (!selectedStartTime || !apiData || apiData.type !== 'single' || !apiData.availableRanges) return [];
        return getSittingEndTimes(apiData.availableRanges, selectedStartTime);
    }, [selectedStartTime, apiData]);

    // Generate time options for multi-day dropdowns
    const timeOptions = useMemo(() => {
        const options: string[] = [];
        for (let hour = 0; hour < 24; hour++) {
            options.push(`${hour.toString().padStart(2, '0')}:00`);
            options.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        return options;
    }, []);

    // Calculate duration for single day bookings
    const calculatedDuration = useMemo(() => {
        if (!selectedStartTime || !selectedEndTime) return 0;
        const start = parseTime(selectedStartTime);
        const end = parseTime(selectedEndTime);
        // Handle wrap-around time: if end is before start, it's the next day
        const diffMinutes = differenceInMinutes(end, start);
        return diffMinutes > 0 ? diffMinutes : diffMinutes + 24 * 60;
    }, [selectedStartTime, selectedEndTime]);

    // --- Event Handlers ---
    const handleStartTimeChange = (startTime: string) => {
        setSelectedStartTime(startTime);
        setSelectedEndTime(""); // Reset end time when start time changes
    };

    const createFullDate = (date: Date, timeStr: string): Date => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const [hours, minutes] = timeStr.split(":").map(Number);

        let fullDate = new Date(year, month, day, hours, minutes);
        return fullDate;
    };

    const handleSingleDayBooking = () => {
        if (!startDate || !selectedStartTime || !selectedEndTime) return;

        let startTime = createFullDate(startDate, selectedStartTime);
        let endTime = createFullDate(startDate, selectedEndTime);

        // Crucial: If end time is logically before or equal to start time, it rolls to the next day
        if (isBefore(endTime, startTime) || isEqual(endTime, startTime)) {
            endTime = addDays(endTime, 1);
        }

        onTimeSlotSelect(startTime, endTime);
    };

    const handleMultiDayBooking = () => {
        if (!startDate || !endDate || !selectedStartTime || !selectedEndTime) return;

        const startTime = createFullDate(startDate, selectedStartTime);
        const endTime = createFullDate(endDate, selectedEndTime);

        if (!isAfter(endTime, startTime)) {
            setError("End date/time must be after start date/time.");
            return;
        }

        onTimeSlotSelect(startTime, endTime);
    };

    // --- Render States ---
    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-2">Checking availability...</p>
            </div>
        );
    }

    // --- Main Render ---
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">
                Dog Sitting Booking
            </h3>

            {/* Date Selection */}
            <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-300">
                    1. Select Date(s)
                </h4>

                {/* --- START OF CORRECTED CALENDAR STACK FIX --- */}
                {/* Use space-y-4 for vertical stacking on all screens */}
                <div className="space-y-4">
                    {/* Start Date Picker */}
                    <div className="w-full">
                        {/* Label is outside the centering div */}
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Start Date
                        </label>
                        <div className="mobile-calendar flex justify-center w-full">
                            <DayPicker
                                mode="single"
                                selected={startDate}
                                onSelect={setStartDate}
                                disabled={{ before: new Date() }}
                                className="rdp-custom-compact"
                            />
                        </div>
                    </div>

                    {/* End Date Picker */}
                    <div className="w-full">
                        {/* Label is outside the centering div */}
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            End Date (optional - for multi-day booking)
                        </label>
                        <div className="mobile-calendar flex justify-center w-full">
                            <DayPicker
                                mode="single"
                                selected={endDate}
                                onSelect={setEndDate}
                                disabled={{ before: startDate || new Date() }}
                                className="rdp-custom-compact"
                            />
                        </div>
                        {startDate && (
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                {endDate && !isSameDay(startDate, endDate)
                                    ? `${differenceInDays(endDate, startDate) + 1} days selected`
                                    : "Choose the same date for single-day, different date for multi-day"
                                }
                            </p>
                        )}
                    </div>
                </div>
                {/* --- END OF CORRECTED CALENDAR STACK FIX --- */}

                {/* Enhanced Availability Status */}
                {apiData && (
                    <div className="space-y-3">
                        {/* Main availability message */}
                        <div className={`p-3 rounded-lg ${apiData.available ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                            {apiData.available 
                                ? (apiData.type === 'single' 
                                    ? `${availableStartTimes.length} time slots available on ${format(startDate!, "MMM d")}`
                                    : apiData.message || "Available for multi-day booking"
                                )
                                : (apiData.message || "Not available")
                            }
                        </div>

                        {/* ✨ NEW: Detailed conflict information */}
                        {!apiData.available && apiData.conflicts && apiData.conflicts.length > 0 && (
                            <div className="p-3 rounded-lg bg-yellow-800 text-yellow-200 border border-yellow-600">
                                <p className="font-semibold mb-2">Unavailable Days:</p>
                                <div className="space-y-1 text-sm">
                                    {apiData.conflictDetails ? (
                                        // Show detailed conflict info if available
                                        apiData.conflictDetails.map((detail, index) => (
                                            <div key={index} className="flex justify-between">
                                                <span>• {detail}</span>
                                            </div>
                                        ))
                                    ) : (
                                        // Fallback to basic conflict list
                                        apiData.conflicts.map((date, index) => (
                                            <div key={index}>• {date}: Existing booking</div>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs mt-2 opacity-90">
                                    💡 Tip: Try booking around these dates or choose a different date range
                                </p>
                            </div>
                        )}

                        {/* ✨ NEW: Walk conflicts notice (when sitting is available but walks exist) */}
                        {apiData.available && apiData.type === 'multi' && (
                            <div className="p-3 rounded-lg bg-blue-800 text-blue-200 border border-blue-600">
                                <p className="text-sm">
                                    ℹ️ <strong>Note:</strong> Dog walking appointments may be scheduled during your sitting period. 
                                    This is normal - I can walk other dogs while caring for your pet.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-lg bg-red-800 text-red-200">
                        {error}
                    </div>
                )}
            </div>

            {/* Single Day Flow */}
            {!isMultiDay && startDate && apiData?.available && apiData.type === 'single' && availableStartTimes.length > 0 && (
                <div className="space-y-4">
                    {/* Start Time Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-300">
                            2. Select Start Time
                        </label>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {availableStartTimes.map((time) => (
                                <button
                                    key={time}
                                    onClick={() => handleStartTimeChange(time)}
                                    className={`
                                        p-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium
                                        ${selectedStartTime === time
                                            ? 'border-blue-500 bg-blue-600 text-white'
                                            : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* End Time Selection */}
                    {selectedStartTime && availableEndTimes.length > 0 && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-300">
                                3. Select End Time
                            </label>
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                {availableEndTimes.map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedEndTime(time)}
                                        className={`
                                            p-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium
                                            ${selectedEndTime === time
                                                ? 'border-blue-500 bg-blue-600 text-white'
                                                : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Single Day Booking Summary */}
                    {selectedStartTime && selectedEndTime && calculatedDuration > 0 && (
                        <div className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                            <div className="text-sm text-gray-300">
                                <p><strong>Date:</strong> {format(startDate, "EEEE, MMMM d")}</p>
                                <p><strong>Start:</strong> {selectedStartTime}</p>
                                <p><strong>End:</strong> {selectedEndTime}</p>
                                <p><strong>Duration:</strong> {Math.floor(calculatedDuration / 60)} hours {calculatedDuration % 60 > 0 ? `${calculatedDuration % 60} minutes` : ''}</p>
                            </div>

                            <button
                                onClick={handleSingleDayBooking}
                                className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                            >
                                Book Dog Sitting
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Multi-Day Flow */}
            {isMultiDay && apiData?.available && apiData.type === 'multi' && startDate && endDate && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Start Time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Start Time ({format(startDate, "MMM d")})
                            </label>
                            <select
                                value={selectedStartTime}
                                onChange={(e) => setSelectedStartTime(e.target.value)}
                                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="">Select start time</option>
                                {timeOptions.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>

                        {/* End Time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                End Time ({format(endDate, "MMM d")})
                            </label>
                            <select
                                value={selectedEndTime}
                                onChange={(e) => setSelectedEndTime(e.target.value)}
                                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="">Select end time</option>
                                {timeOptions.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Multi-Day Booking Summary */}
                    {selectedStartTime && selectedEndTime && (
                        <div className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                            <div className="text-sm text-gray-300">
                                <p><strong>Type:</strong> Multi-Day Dog Sitting</p>
                                <p><strong>Duration:</strong> {differenceInDays(endDate, startDate) + 1} days</p>
                                <p><strong>Start:</strong> {format(startDate, "EEEE, MMMM d")} at {selectedStartTime}</p>
                                <p><strong>End:</strong> {format(endDate, "EEEE, MMMM d")} at {selectedEndTime}</p>
                            </div>

                            <button
                                onClick={handleMultiDayBooking}
                                className="w-full p-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200"
                            >
                                Book Multi-Day Dog Sitting
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* No availability message */}
            {apiData && !apiData.available && (
                <div className="text-center py-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
                    <p className="text-gray-300">
                        {apiData.message || "No availability for selected dates."}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Please try different dates.</p>
                    {apiData.conflicts && apiData.conflicts.length > 0 && (
                        <p className="text-red-400 text-sm mt-2">
                            Conflicts on: {apiData.conflicts.join(', ')}
                        </p>
                    )}
                </div>
            )}

            {/* Info text */}
            <div className="text-xs text-gray-400 text-center space-y-1">
                <p>• Dog sitting has a 1-hour minimum duration for single day bookings</p>
                <p>• Extended hours available: 00:00 - 23:59 (24 hours)</p>
                <p>• Multi-day bookings are available any time from 00:00 to 23:59</p>
                <p>• Price will be discussed based on your requirements (POA)</p>
                <p>• Choose the same date for single-day, different dates for multi-day booking</p>
            </div>
        </div>
    );
}