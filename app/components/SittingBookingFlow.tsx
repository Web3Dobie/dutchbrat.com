import React, { useState, useMemo } from "react";
import { parse, addMinutes, format, differenceInMinutes, isBefore, isEqual, isAfter, isSameDay } from "date-fns";

// --- Types ---
type ApiRange = {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
};

interface SittingBookingFlowProps {
    selectedDay: Date | undefined;
    apiRanges: ApiRange[];
    isLoading: boolean;
    onTimeSlotSelect: (startTime: Date, endTime: Date) => void;
}

// --- Helper Functions ---
const parseTime = (timeStr: string): Date => {
    return parse(timeStr, "HH:mm", new Date());
};

const getSittingStartTimes = (ranges: ApiRange[]): string[] => {
    const slots: string[] = [];
    const minDuration = 60; // 1 hour minimum

    for (const range of ranges) {
        let currentSlot = parseTime(range.start);
        const end = parseTime(range.end);

        while (isBefore(addMinutes(currentSlot, minDuration), end) || isEqual(addMinutes(currentSlot, minDuration), end)) {
            slots.push(format(currentSlot, "HH:mm"));
            currentSlot = addMinutes(currentSlot, 30); // 30-minute intervals
        }
    }
    return slots;
};

export default function SittingBookingFlow({
    selectedDay,
    apiRanges,
    isLoading,
    onTimeSlotSelect
}: SittingBookingFlowProps) {

    const [selectedStartTime, setSelectedStartTime] = useState<string>("");
    const [selectedDuration, setSelectedDuration] = useState<number>(60);

    // --- Generate available start times ---
    const availableStartTimes = useMemo(() => {
        if (!selectedDay) return [];

        const generatedStartTimes = getSittingStartTimes(apiRanges);

        // Filter past slots for today
        const now = new Date();
        const isToday = isSameDay(selectedDay, now);

        if (isToday) {
            return generatedStartTimes.filter(slot => isAfter(parseTime(slot), now));
        }

        return generatedStartTimes;
    }, [apiRanges, selectedDay]);

    // --- Generate available durations for selected start time ---
    const availableDurations = useMemo(() => {
        if (!selectedStartTime) return [];

        const startTime = parseTime(selectedStartTime);
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
    }, [selectedStartTime, apiRanges]);

    // --- Create full Date objects and submit ---
    const createFullDate = (timeStr: string): Date | null => {
        if (!selectedDay) return null;
        const year = selectedDay.getFullYear();
        const month = selectedDay.getMonth();
        const day = selectedDay.getDate();
        const [hours, minutes] = timeStr.split(":").map(Number);
        return new Date(year, month, day, hours, minutes);
    };

    const handleBookingSitting = () => {
        if (!selectedStartTime || !selectedDuration) return;

        const startTime = createFullDate(selectedStartTime);
        if (!startTime) return;

        const endTime = addMinutes(startTime, selectedDuration);
        onTimeSlotSelect(startTime, endTime);
    };

    // --- Reset duration when start time changes ---
    const handleStartTimeChange = (startTime: string) => {
        setSelectedStartTime(startTime);
        setSelectedDuration(60); // Reset to minimum
    };

    // --- Render States ---
    if (!selectedDay) {
        return (
            <div className="text-center py-8 text-gray-400">
                Please select a date to see available times.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading availability...</p>
            </div>
        );
    }

    if (apiRanges.length === 0) {
        return (
            <div className="text-center py-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
                <p className="text-gray-300">No availability for this day.</p>
                <p className="text-gray-400 text-sm mt-1">Please try another date.</p>
            </div>
        );
    }

    if (availableStartTimes.length === 0) {
        return (
            <div className="text-center py-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
                <p className="text-gray-300">No ranges long enough for the 1-hour minimum.</p>
                <p className="text-gray-400 text-sm mt-1">Please try another day.</p>
            </div>
        );
    }

    // --- Main Render ---
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">
                3. Configure Dog Sitting
            </h3>

            {/* Start Time Selection */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                    Start Time
                </label>

                {/* Mobile: Large dropdown */}
                <div className="block sm:hidden">
                    <select
                        value={selectedStartTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="w-full p-4 text-lg bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Select start time...</option>
                        {availableStartTimes.map((time) => (
                            <option key={time} value={time}>
                                {time}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Desktop: Button grid */}
                <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {availableStartTimes.map((time) => (
                        <button
                            key={time}
                            onClick={() => handleStartTimeChange(time)}
                            className={`
                                p-3 rounded-lg border-2 transition-all duration-200 font-medium
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

            {/* Duration Selection */}
            {selectedStartTime && (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300">
                        Duration
                    </label>

                    {/* Mobile: Large dropdown */}
                    <div className="block sm:hidden">
                        <select
                            value={selectedDuration}
                            onChange={(e) => setSelectedDuration(parseInt(e.target.value, 10))}
                            className="w-full p-4 text-lg bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {availableDurations.map((duration) => (
                                <option key={duration.value} value={duration.value}>
                                    {duration.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Desktop: Button grid */}
                    <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {availableDurations.map((duration) => (
                            <button
                                key={duration.value}
                                onClick={() => setSelectedDuration(duration.value)}
                                className={`
                                    p-3 rounded-lg border-2 transition-all duration-200 font-medium
                                    ${selectedDuration === duration.value
                                        ? 'border-blue-500 bg-blue-600 text-white'
                                        : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                                    }
                                `}
                            >
                                {duration.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary and Book Button */}
            {selectedStartTime && selectedDuration && (
                <div className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                    <div className="text-sm text-gray-300">
                        <p><strong>Start:</strong> {selectedStartTime}</p>
                        <p><strong>Duration:</strong> {availableDurations.find(d => d.value === selectedDuration)?.label}</p>
                        <p><strong>End:</strong> {format(addMinutes(parseTime(selectedStartTime), selectedDuration), "HH:mm")}</p>
                    </div>

                    <button
                        onClick={handleBookingSitting}
                        className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                        Book Dog Sitting
                    </button>
                </div>
            )}

            {/* Info text */}
            <div className="text-xs text-gray-400 text-center">
                <p>Dog sitting has a 1-hour minimum duration</p>
                <p>Price will be discussed based on your requirements</p>
            </div>
        </div>
    );
}