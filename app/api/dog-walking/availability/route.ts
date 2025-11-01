import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import {
    format,
    startOfDay,
    endOfDay,
    isBefore,
    isAfter,
    max,
    min,
    addDays,
    differenceInDays,
} from "date-fns";
import {
    TZDate
} from "@date-fns/tz";

// --- Configuration ---
const TIMEZONE = "Europe/London";
const TRAVEL_BUFFER_MINUTES = 15;

// Service-specific working hours
const SERVICE_HOURS = {
    'dog-sitting': { start: 0, end: 24 }, // 00:00-23:59 (full day)
    'default': { start: 9, end: 20 }      // 9:00-20:00 (other services)
};

// --- Authentication ---
const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
});
const calendar = google.calendar({ version: "v3", auth });

interface TimeRange {
    start: Date;
    end: Date;
}

// Function to get working hours based on service type
function getWorkingHours(serviceType: string | null) {
    if (serviceType === 'dog-sitting') {
        return SERVICE_HOURS['dog-sitting'];
    }
    return SERVICE_HOURS['default'];
}

// Function to handle multi-day availability for dog sitting
async function handleMultiDayAvailability(startDateStr: string, endDateStr: string, serviceType: string | null) {
    try {
        const startDate = new TZDate(startDateStr, TIMEZONE);
        const endDate = new TZDate(endDateStr, TIMEZONE);
        
        // For multi-day bookings, we check if the entire period is free
        const dayStart = startOfDay(startDate);
        const dayEnd = endOfDay(endDate);

        // Fetch Google Calendar events for the entire period
        const res = await calendar.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const busyEvents = res.data.items || [];

        // Check if there are any conflicting events
        const hasConflicts = busyEvents.some(event => {
            if (!event.start?.dateTime || !event.end?.dateTime) return false;
            
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            
            // Apply 15-minute buffer
            const bufferedStart = new Date(eventStart.getTime() - TRAVEL_BUFFER_MINUTES * 60000);
            const bufferedEnd = new Date(eventEnd.getTime() + TRAVEL_BUFFER_MINUTES * 60000);
            
            // Check if there's any overlap with our desired period
            return !(bufferedEnd <= dayStart || bufferedStart >= dayEnd);
        });

        // Return whether the entire period is available and time ranges for UI
        const numDays = differenceInDays(endDate, startDate) + 1;
        const available = !hasConflicts;
        
        return NextResponse.json({ 
            available,
            conflictingEvents: available ? [] : busyEvents.length,
            message: available 
                ? `Available for ${numDays} days (${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')})`
                : `Not available - conflicts found in calendar`,
            // For multi-day, we return full day ranges if available
            availableRanges: available ? [{
                start: "00:00",
                end: "23:59"
            }] : []
        });

    } catch (error) {
        console.error("Error fetching multi-day availability:", error);
        return NextResponse.json(
            { error: "Failed to fetch multi-day availability" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dateQuery = searchParams.get("date"); // e.g., "2023-10-31"
    const serviceType = searchParams.get("service_type"); // e.g., "dog-sitting"
    const startDateQuery = searchParams.get("start_date"); // For multi-day queries
    const endDateQuery = searchParams.get("end_date"); // For multi-day queries

    // Handle multi-day queries for dog sitting
    if (startDateQuery && endDateQuery) {
        return handleMultiDayAvailability(startDateQuery, endDateQuery, serviceType);
    }

    if (!dateQuery) {
        return NextResponse.json(
            { error: "Date parameter is required" },
            { status: 400 }
        );
    }

    try {
        // 1. Get the target date using the TZDate constructor
        const targetDate = new TZDate(dateQuery, TIMEZONE);

        // 2. Define the day's boundaries
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        // 3. Fetch Google Calendar events
        const res = await calendar.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const busyEvents = res.data.items || [];

        // --- Define Workday Edges based on service type ---
        const workingHours = getWorkingHours(serviceType);
        const workDayStart = new TZDate(targetDate, TIMEZONE);
        workDayStart.setHours(workingHours.start, 0, 0, 0);

        const workDayEnd = new TZDate(targetDate, TIMEZONE);
        workDayEnd.setHours(workingHours.end, 0, 0, 0);

        // 4. Sanitize and "Pad" all busy events (NEW CONDITIONAL LOGIC)
        const paddedBusyTimes: TimeRange[] = busyEvents
            .filter((event) => event.start?.dateTime && event.end?.dateTime)
            .map((event) => {
                const start = new Date(event.start!.dateTime!);
                const end = new Date(event.end!.dateTime!);

                // Check if event starts at the beginning of the workday
                const isFirstBooking = start.getTime() === workDayStart.getTime();

                // Check if event ends at the end of the workday
                const isLastBooking = end.getTime() === workDayEnd.getTime();

                // Conditionally apply buffers
                const paddedStart = isFirstBooking
                    ? start // Don't add *before* buffer
                    : new Date(start.getTime() - TRAVEL_BUFFER_MINUTES * 60000);

                const paddedEnd = isLastBooking
                    ? end // Don't add *after* buffer
                    : new Date(end.getTime() + TRAVEL_BUFFER_MINUTES * 60000);

                return {
                    start: paddedStart,
                    end: paddedEnd,
                };
            });

        // 5. Merge overlapping padded events (Logic is unchanged)
        const mergedBusyTimes: TimeRange[] = [];
        if (paddedBusyTimes.length > 0) {
            paddedBusyTimes.sort((a, b) => a.start.getTime() - b.start.getTime());
            let currentMerge = { ...paddedBusyTimes[0] };
            for (let i = 1; i < paddedBusyTimes.length; i++) {
                const nextEvent = paddedBusyTimes[i];
                if (nextEvent.start.getTime() <= currentMerge.end.getTime()) {
                    currentMerge.end = max([currentMerge.end, nextEvent.end]);
                } else {
                    mergedBusyTimes.push(currentMerge);
                    currentMerge = { ...nextEvent };
                }
            }
            mergedBusyTimes.push(currentMerge);
        }

        // 6. Invert: Find free ranges within working hours
        const availableRanges: TimeRange[] = [];
        let currentFreeStart = workDayStart; // Use the edge we defined earlier

        for (const busyBlock of mergedBusyTimes) {
            if (isBefore(currentFreeStart, busyBlock.start)) {
                availableRanges.push({
                    start: currentFreeStart,
                    end: busyBlock.start,
                });
            }
            currentFreeStart = max([currentFreeStart, busyBlock.end]);
        }

        if (isBefore(currentFreeStart, workDayEnd)) { // Use the edge we defined earlier
            availableRanges.push({
                start: currentFreeStart,
                end: workDayEnd,
            });
        }

        // 7. Format the final ranges (Logic is unchanged)
        const finalRanges = availableRanges.map((range) => {
            return {
                start: format(range.start, "HH:mm"),
                end: format(range.end, "HH:mm"),
            };
        });

        return NextResponse.json({ availableRanges: finalRanges });

    } catch (error) {
        console.error("Error fetching availability:", error);
        return NextResponse.json(
            { error: "Failed to fetch availability" },
            { status: 500 }
        );
    }
}