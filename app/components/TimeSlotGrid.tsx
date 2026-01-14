import React, { useMemo } from "react";
import { parse, addMinutes, format, isBefore, isEqual, isAfter, isSameDay } from "date-fns";
import { TZDate } from "@date-fns/tz";

// --- Types ---
type ApiRange = {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
};

interface Service {
    id: string;
    name: string;
    duration: number | null;
}

interface TimeSlotGridProps {
    selectedService: Service | undefined;
    selectedDay: Date | undefined;
    apiRanges: ApiRange[];
    isLoading: boolean;
    onTimeSlotSelect: (startTime: Date, endTime: Date) => void;
}

// --- Helper Functions ---
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
            currentSlot = addMinutes(currentSlot, 15); // 15-minute intervals
        }
    }
    return slots;
};

export default function TimeSlotGrid({
    selectedService,
    selectedDay,
    apiRanges,
    isLoading,
    onTimeSlotSelect
}: TimeSlotGridProps) {

    // --- Generate available slots ---
    const availableSlots = useMemo(() => {
        if (!selectedService || !selectedService.duration || !selectedDay) return [];

        const generatedSlots = generateWalkSlots(apiRanges, selectedService.duration);

        // Filter past slots for today
        const now = new Date();
        const isToday = isSameDay(selectedDay, now);

        if (isToday) {
            return generatedSlots.filter(slot => isAfter(parseTime(slot), now));
        }

        return generatedSlots;
    }, [apiRanges, selectedService, selectedDay]);

    // --- Create full Date objects for booking (always in London timezone) ---
    const createFullDate = (timeStr: string): Date | null => {
        if (!selectedDay) return null;
        const year = selectedDay.getFullYear();
        const month = selectedDay.getMonth();
        const day = selectedDay.getDate();
        const [hours, minutes] = timeStr.split(":").map(Number);
        // Create date in London timezone to ensure correct UTC conversion
        const londonDate = new TZDate(year, month, day, hours, minutes, 0, "Europe/London");
        return new Date(londonDate.getTime());
    };

    const handleSlotClick = (slot: string) => {
        if (!selectedService || !selectedService.duration) return;

        const startTime = createFullDate(slot);
        if (!startTime) return;

        const endTime = addMinutes(startTime, selectedService.duration);
        onTimeSlotSelect(startTime, endTime);
    };

    // --- Organize slots by time period for mobile ---
    const organizeSlotsByPeriod = (slots: string[]) => {
        const morning = slots.filter(slot => {
            const hour = parseInt(slot.split(':')[0]);
            return hour >= 9 && hour < 12;
        });

        const afternoon = slots.filter(slot => {
            const hour = parseInt(slot.split(':')[0]);
            return hour >= 12 && hour < 17;
        });

        const evening = slots.filter(slot => {
            const hour = parseInt(slot.split(':')[0]);
            return hour >= 17 && hour <= 20;
        });

        return { morning, afternoon, evening };
    };

    const { morning, afternoon, evening } = organizeSlotsByPeriod(availableSlots);

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

    if (availableSlots.length === 0) {
        return (
            <div className="text-center py-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
                <p className="text-gray-300">No time slots available.</p>
                <p className="text-gray-400 text-sm mt-1">Please try another service or day.</p>
            </div>
        );
    }

    // --- Main Render ---
    return (
        <div className="space-y-6">
           
            {/* Mobile: Organized by time periods */}
            <div className="block sm:hidden space-y-6">
                {morning.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Morning (9AM - 12PM)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {morning.map((slot) => (
                                <button
                                    key={slot}
                                    onClick={() => handleSlotClick(slot)}
                                    className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-200 font-medium"
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {afternoon.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Afternoon (12PM - 5PM)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {afternoon.map((slot) => (
                                <button
                                    key={slot}
                                    onClick={() => handleSlotClick(slot)}
                                    className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-200 font-medium"
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {evening.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Evening (5PM - 8PM)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {evening.map((slot) => (
                                <button
                                    key={slot}
                                    onClick={() => handleSlotClick(slot)}
                                    className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-200 font-medium"
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop: Flexible grid layout */}
            <div className="hidden sm:block">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {availableSlots.map((slot) => (
                        <button
                            key={slot}
                            onClick={() => handleSlotClick(slot)}
                            className="p-3 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-200 font-medium"
                        >
                            {slot}
                        </button>
                    ))}
                </div>
            </div>

            {/* Info text */}
            <div className="text-xs text-gray-400 text-center">
                {selectedService && selectedService.duration && (
                    <p>Each slot is {selectedService.duration} minutes long</p>
                )}
            </div>
        </div>
    );
}