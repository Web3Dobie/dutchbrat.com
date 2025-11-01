import React, { useState, useMemo, useEffect } from "react";
import { parse, addMinutes, format, differenceInMinutes, isBefore, isEqual, isAfter, isSameDay, differenceInDays } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

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
    if (ranges.length === 0) return [];
    
    // For Dog Sitting, generate clean 30-minute slots from 00:00 to 23:30
    const cleanSlots: string[] = [];
    
    // Generate 30-minute intervals for full 24-hour period
    for (let hour = 0; hour < 24; hour++) {
        cleanSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        cleanSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    
    // Filter only slots that have at least 1 hour of availability
    return cleanSlots.filter(slot => {
        const slotTime = parseTime(slot);
        const minEndTime = addMinutes(slotTime, 60); // 1 hour minimum
        
        // Check if this slot fits within any available range
        return ranges.some(range => {
            const rangeStart = parseTime(range.start);
            const rangeEnd = parseTime(range.end);
            
            // Handle ranges that cross midnight (e.g., 22:00 to 02:00 next day)
            const rangeStartTime = rangeStart.getHours() * 60 + rangeStart.getMinutes();
            const rangeEndTime = rangeEnd.getHours() * 60 + rangeEnd.getMinutes();
            const slotTimeMinutes = slotTime.getHours() * 60 + slotTime.getMinutes();
            const minEndTimeMinutes = minEndTime.getHours() * 60 + minEndTime.getMinutes();
            
            // If range crosses midnight (end time < start time)
            if (rangeEndTime < rangeStartTime) {
                // Slot can start in evening part (after range start) or morning part (before range end)
                const canStartEvening = slotTimeMinutes >= rangeStartTime && minEndTimeMinutes <= 24 * 60;
                const canStartMorning = slotTimeMinutes >= 0 && minEndTimeMinutes <= rangeEndTime;
                return canStartEvening || canStartMorning;
            } else {
                // Normal range within same day
                const canStart = slotTimeMinutes >= rangeStartTime;
                const hasEnoughTime = minEndTimeMinutes <= rangeEndTime;
                return canStart && hasEnoughTime;
            }
        });
    });
};

export default function SittingBookingFlow({
    selectedDay,
    apiRanges,
    isLoading,
    onTimeSlotSelect
}: SittingBookingFlowProps) {

    // --- State for booking type and date selection ---
    const [startDate, setStartDate] = useState<Date | undefined>(selectedDay);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [selectedStartTime, setSelectedStartTime] = useState<string>("");
    const [selectedEndTime, setSelectedEndTime] = useState<string>("");
    const [selectedDuration, setSelectedDuration] = useState<number>(60);
    
    // Multi-day state
    const [isMultiDay, setIsMultiDay] = useState<boolean>(false);
    const [multiDayAvailable, setMultiDayAvailable] = useState<boolean | null>(null);
    const [multiDayLoading, setMultiDayLoading] = useState<boolean>(false);

    // Auto-detect if this should be multi-day based on date selection
    useEffect(() => {
        if (startDate && endDate && !isSameDay(startDate, endDate)) {
            setIsMultiDay(true);
            checkMultiDayAvailability();
        } else {
            setIsMultiDay(false);
            setMultiDayAvailable(null);
        }
    }, [startDate, endDate]);

    // Check multi-day availability
    const checkMultiDayAvailability = async () => {
        if (!startDate || !endDate || isSameDay(startDate, endDate)) return;

        setMultiDayLoading(true);
        try {
            const startDateStr = format(startDate, "yyyy-MM-dd");
            const endDateStr = format(endDate, "yyyy-MM-dd");
            
            const response = await fetch(
                `/api/dog-walking/availability?start_date=${startDateStr}&end_date=${endDateStr}&service_type=dog-sitting`
            );
            
            if (!response.ok) throw new Error("Failed to check availability");
            
            const data = await response.json();
            setMultiDayAvailable(data.available);
        } catch (error) {
            console.error("Error checking multi-day availability:", error);
            setMultiDayAvailable(false);
        } finally {
            setMultiDayLoading(false);
        }
    };

    // --- Generate available start times for single day ---
    const availableStartTimes = useMemo(() => {
        if (isMultiDay || !startDate) return [];

        const generatedStartTimes = getSittingStartTimes(apiRanges);

        // Filter past slots for today
        const now = new Date();
        const isToday = isSameDay(startDate, now);

        if (isToday) {
            return generatedStartTimes.filter(slot => isAfter(parseTime(slot), now));
        }

        return generatedStartTimes;
    }, [apiRanges, startDate, isMultiDay]);

    // --- Generate available durations for selected start time ---
    const availableDurations = useMemo(() => {
        if (isMultiDay || !selectedStartTime) return [];

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
    }, [selectedStartTime, apiRanges, isMultiDay]);

    // --- Handle single day booking ---
    const handleSingleDayBooking = () => {
        if (!selectedStartTime || !selectedDuration || !startDate) return;

        const startTime = new Date(startDate);
        const [hours, minutes] = selectedStartTime.split(":").map(Number);
        startTime.setHours(hours, minutes, 0, 0);

        const endTime = addMinutes(startTime, selectedDuration);
        onTimeSlotSelect(startTime, endTime);
    };

    // --- Handle multi-day booking ---
    const handleMultiDayBooking = () => {
        if (!startDate || !endDate || !selectedStartTime || !selectedEndTime || !multiDayAvailable) return;

        // Create start time on start date
        const startTime = new Date(startDate);
        const [startHours, startMinutes] = selectedStartTime.split(":").map(Number);
        startTime.setHours(startHours, startMinutes, 0, 0);

        // Create end time on end date
        const endTime = new Date(endDate);
        const [endHours, endMinutes] = selectedEndTime.split(":").map(Number);
        endTime.setHours(endHours, endMinutes, 0, 0);

        onTimeSlotSelect(startTime, endTime);
    };

    // --- Date picker configuration ---
    const disabledDays = [
        { before: new Date() },
        { dayOfWeek: [0, 6] } // Disable weekends
    ];

    // --- Time options for multi-day (simplified - any time) ---
    const timeOptions: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            timeOptions.push(timeStr);
        }
    }

    // --- Render States ---
    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading availability...</p>
            </div>
        );
    }

    // --- Main Render ---
    console.log("SittingBookingFlow rendering", { selectedDay, apiRanges })
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">
                2. Select Dog Sitting Details
            </h3>

            {/* Date Range Picker */}
            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-300">
                    Select Date(s)
                </label>
                
                <div className="space-y-6">
                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Start Date</label>
                        <DayPicker
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            disabled={disabledDays}
                            className="bg-gray-800 rounded-lg p-4 border border-gray-600 w-full"
                            classNames={{
                                day_selected: "bg-blue-600 text-white",
                                day_today: "bg-gray-700 font-bold",
                                day: "hover:bg-gray-700"
                            }}
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            End Date (optional for multi-day)
                        </label>
                        <DayPicker
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            disabled={[
                                ...disabledDays,
                                ...(startDate ? [{ before: startDate }] : [])
                            ]}
                            className="bg-gray-800 rounded-lg p-4 border border-gray-600 w-full"
                            classNames={{
                                day_selected: "bg-green-600 text-white",
                                day_today: "bg-gray-700 font-bold",
                                day: "hover:bg-gray-700"
                            }}
                        />
                    </div>
                </div>

                {/* Multi-day indicator */}
                {isMultiDay && startDate && endDate && (
                    <div className="p-4 bg-blue-900 rounded-lg border border-blue-600">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-200 font-medium">
                                    Multi-Day Dog Sitting: {differenceInDays(endDate, startDate) + 1} days
                                </p>
                                <p className="text-blue-300 text-sm">
                                    {format(startDate, "MMM d")} - {format(endDate, "MMM d")}
                                </p>
                            </div>
                            {multiDayLoading && (
                                <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                            )}
                        </div>
                        
                        {multiDayAvailable !== null && !multiDayLoading && (
                            <div className={`mt-2 p-2 rounded ${multiDayAvailable ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                                {multiDayAvailable ? "✓ Available for entire period" : "✗ Conflicts found - not available"}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Single Day Flow */}
            {!isMultiDay && startDate && availableStartTimes.length > 0 && (
                <div className="space-y-4">
                    {/* Start Time Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-300">
                            Start Time
                        </label>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {availableStartTimes.map((time) => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedStartTime(time)}
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

                    {/* Duration Selection */}
                    {selectedStartTime && availableDurations.length > 0 && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-300">
                                Duration
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
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

                    {/* Single Day Booking Summary */}
                    {selectedStartTime && selectedDuration && (
                        <div className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                            <div className="text-sm text-gray-300">
                                <p><strong>Date:</strong> {format(startDate, "EEEE, MMMM d")}</p>
                                <p><strong>Start:</strong> {selectedStartTime}</p>
                                <p><strong>Duration:</strong> {availableDurations.find(d => d.value === selectedDuration)?.label}</p>
                                <p><strong>End:</strong> {format(addMinutes(parseTime(selectedStartTime), selectedDuration), "HH:mm")}</p>
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
            {isMultiDay && multiDayAvailable && startDate && endDate && (
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
            {!isMultiDay && startDate && availableStartTimes.length === 0 && (
                <div className="text-center py-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
                    <p className="text-gray-300">No availability for this day.</p>
                    <p className="text-gray-400 text-sm mt-1">Please try another date.</p>
                </div>
            )}

            {/* Info text */}
            <div className="text-xs text-gray-400 text-center space-y-1">
                <p>• Dog sitting has a 1-hour minimum duration for single day bookings</p>
                <p>• Multi-day bookings are available any time from 00:00 to 23:59</p>
                <p>• Price will be discussed based on your requirements (POA)</p>
                <p>• Choose the same date for single-day, different dates for multi-day booking</p>
            </div>
        </div>
    );
}