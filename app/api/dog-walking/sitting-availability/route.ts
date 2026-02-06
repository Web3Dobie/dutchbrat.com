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
    parseISO,
    isSameDay,
    getDay,
} from "date-fns";
import {
    TZDate
} from "@date-fns/tz";

// --- Configuration ---
const TIMEZONE = "Europe/London";
const TRAVEL_BUFFER_MINUTES = 15;

// Dog sitting operates 24/7
const DOG_SITTING_START_HOUR = 0;   // 00:00
const DOG_SITTING_END_HOUR = 24;    // 24:00 (end of day)

// --- Authentication ---
const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
});
const calendar = google.calendar({ version: "v3", auth });

interface TimeRange {
    start: Date;
    end: Date;
}

interface AvailabilityResult {
    available: boolean;
    type: 'single' | 'multi';
    availableRanges?: { start: string; end: string; }[];
    startDayRanges?: { start: string; end: string; }[];
    endDayRanges?: { start: string; end: string; }[];
    conflicts?: string[];
    conflictDetails?: string[];
    hasWalks?: boolean;
    message?: string;
}

// Function to get busy events for a date range
async function getBusyEvents(startDate: Date, endDate: Date) {
    const res = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
    });

    return res.data.items || [];
}

// Function to check single day availability
async function checkSingleDayAvailability(date: string): Promise<AvailabilityResult> {
    const targetDate = new TZDate(date, TIMEZONE);

    // Block single-day sitting on weekends (Saturday = 6, Sunday = 0)
    // Multi-day sitting spanning weekends is still allowed
    const dayOfWeek = getDay(targetDate);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
        return {
            available: false,
            type: 'single',
            availableRanges: [],
            message: "Single-day dog sitting is not available on weekends. Please book multi-day sitting for weekend care (e.g., Friday to Monday)."
        };
    }

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Set working hours for dog sitting (24-hour)
    const workDayStart = new TZDate(targetDate, TIMEZONE);
    workDayStart.setHours(DOG_SITTING_START_HOUR, 0, 0, 0);

    const workDayEnd = new TZDate(targetDate, TIMEZONE);
    workDayEnd.setHours(23, 59, 59, 999); // End of day

    const busyEvents = await getBusyEvents(dayStart, dayEnd);

    // Check if there are walks on this day (for 6-hour minimum enforcement)
    const hasWalks = busyEvents.some(event => {
        const summary = (event.summary || '').toLowerCase();
        return summary.includes('walk') || summary.includes('meet');
    });

    // Process busy events with buffers
    // Exclude walk events - sitting can coexist with walks (if 6+ hours, enforced by frontend)
    const paddedBusyTimes: TimeRange[] = busyEvents
        .filter((event) => event.start?.dateTime && event.end?.dateTime)
        .filter((event) => {
            const summary = (event.summary || '').toLowerCase();
            // Walk events contain 'walk' or 'meet' in summary - exclude them
            if (summary.includes('walk') || summary.includes('meet')) {
                return false; // EXCLUDE walks (allow sitting to span these times)
            }
            return true; // INCLUDE other events (sitting, etc.)
        })
        .map((event) => {
            const start = new Date(event.start!.dateTime!);
            const end = new Date(event.end!.dateTime!);

            // Apply 15-minute buffers
            const paddedStart = new Date(start.getTime() - TRAVEL_BUFFER_MINUTES * 60000);
            const paddedEnd = new Date(end.getTime() + TRAVEL_BUFFER_MINUTES * 60000);

            return { start: paddedStart, end: paddedEnd };
        });

    // Merge overlapping events
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

    // Find available ranges
    const availableRanges: TimeRange[] = [];
    let currentFreeStart = workDayStart;

    for (const busyBlock of mergedBusyTimes) {
        if (isBefore(currentFreeStart, busyBlock.start)) {
            availableRanges.push({
                start: currentFreeStart,
                end: busyBlock.start,
            });
        }
        currentFreeStart = max([currentFreeStart, busyBlock.end]);
    }

    if (isBefore(currentFreeStart, workDayEnd)) {
        availableRanges.push({
            start: currentFreeStart,
            end: workDayEnd,
        });
    }

    // Format ranges
    const formattedRanges = availableRanges.map((range) => ({
        start: format(range.start, "HH:mm"),
        end: format(range.end, "HH:mm"),
    }));

    return {
        available: formattedRanges.length > 0,
        type: 'single',
        availableRanges: formattedRanges,
        hasWalks: hasWalks,
        message: formattedRanges.length > 0
            ? hasWalks
                ? `Available (minimum 6 hours required - walks scheduled)`
                : `${formattedRanges.length} time slots available on ${format(targetDate, 'MMM d')}`
            : `No availability on ${format(targetDate, 'MMM d')} - fully booked`
    };
}

// Enhanced function to check multi-day availability with smart conflict detection
async function checkMultiDayAvailability(startDate: string, endDate: string): Promise<AvailabilityResult> {
    const startDateObj = new TZDate(startDate, TIMEZONE);
    const endDateObj = new TZDate(endDate, TIMEZONE);

    // Validate date order
    if (isAfter(startDateObj, endDateObj)) {
        return {
            available: false,
            type: 'multi',
            message: "End date must be after start date"
        };
    }

    const totalDays = differenceInDays(endDateObj, startDateObj) + 1;

    // Get all busy events for the entire period
    const periodStart = startOfDay(startDateObj);
    const periodEnd = endOfDay(endDateObj);
    const busyEvents = await getBusyEvents(periodStart, periodEnd);

    // Analyze conflicts day by day with SERVICE TYPE awareness
    const conflicts: string[] = [];
    const conflictDetails: string[] = [];
    let availableDays = 0;
    let currentDate = startDateObj;

    while (!isAfter(currentDate, endDateObj)) {
        const dayStart = startOfDay(currentDate);
        const dayEnd = endOfDay(currentDate);
        const dateKey = format(currentDate, 'MMM d');

        // Check if any busy events conflict with this day
        const dayConflicts = busyEvents.filter(event => {
            if (!event.start?.dateTime || !event.end?.dateTime) return false;

            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);

            // Apply buffers
            const bufferedStart = new Date(eventStart.getTime() - TRAVEL_BUFFER_MINUTES * 60000);
            const bufferedEnd = new Date(eventEnd.getTime() + TRAVEL_BUFFER_MINUTES * 60000);

            // Check overlap with this day
            return !(bufferedEnd <= dayStart || bufferedStart >= dayEnd);
        });

        if (dayConflicts.length > 0) {
            // ✨ NEW: Analyze the TYPE of conflicts
            const sittingConflicts = dayConflicts.filter(event => 
                event.summary?.toLowerCase().includes('sitting') || 
                event.summary?.toLowerCase().includes('boarding')
            );
            
            const walkConflicts = dayConflicts.filter(event => 
                event.summary?.toLowerCase().includes('walk') || 
                event.summary?.toLowerCase().includes('meet')
            );

            if (sittingConflicts.length > 0) {
                // DOG SITTING conflicts - BLOCK this day
                conflicts.push(dateKey);
                conflictDetails.push(`${dateKey}: Dog sitting conflict`);
            } else if (walkConflicts.length > 0) {
                // WALK conflicts - ALLOW (you can walk other dogs during sitting)
                availableDays++;
                // Note: You might want to add a note about walks scheduled
            } else {
                // OTHER conflicts - BLOCK to be safe
                conflicts.push(dateKey);
                conflictDetails.push(`${dateKey}: Existing booking`);
            }
        } else {
            // No conflicts - available
            availableDays++;
        }

        currentDate = addDays(currentDate, 1);
    }

    // Determine availability based on conflicts
    if (conflicts.length === 0) {
        // ✅ FULLY AVAILABLE
        const startDayAvailability = await checkSingleDayAvailability(startDate);
        const endDayAvailability = isSameDay(startDateObj, endDateObj)
            ? startDayAvailability
            : await checkSingleDayAvailability(endDate);

        return {
            available: true,
            type: 'multi',
            startDayRanges: startDayAvailability.availableRanges,
            endDayRanges: endDayAvailability.availableRanges,
            message: `Available for all ${totalDays} days (${format(startDateObj, 'MMM d')} - ${format(endDateObj, 'MMM d')})`
        };
    } else if (availableDays > 0) {
        // ⚠️ PARTIALLY AVAILABLE
        return {
            available: false,
            type: 'multi',
            conflicts,
            conflictDetails,
            message: `Multi-day sitting unavailable. Conflicts on: ${conflicts.join(', ')}. Try different dates or book around these days.`
        };
    } else {
        // ❌ FULLY UNAVAILABLE
        return {
            available: false,
            type: 'multi',
            conflicts,
            conflictDetails,
            message: `No availability for ${totalDays}-day period. All days have dog sitting conflicts.`
        };
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // 'single' | 'multi'
    const date = searchParams.get("date"); // For single day
    const startDate = searchParams.get("start_date"); // For multi-day
    const endDate = searchParams.get("end_date"); // For multi-day

    try {
        if (type === "single") {
            if (!date) {
                return NextResponse.json(
                    { error: "Date parameter is required for single day queries" },
                    { status: 400 }
                );
            }

            const result = await checkSingleDayAvailability(date);
            return NextResponse.json(result);
        }

        if (type === "multi") {
            if (!startDate || !endDate) {
                return NextResponse.json(
                    { error: "start_date and end_date parameters are required for multi-day queries" },
                    { status: 400 }
                );
            }

            const result = await checkMultiDayAvailability(startDate, endDate);
            return NextResponse.json(result);
        }

        return NextResponse.json(
            { error: "Type parameter must be 'single' or 'multi'" },
            { status: 400 }
        );

    } catch (error) {
        console.error("Error fetching dog sitting availability:", error);
        return NextResponse.json(
            { error: "Failed to fetch availability" },
            { status: 500 }
        );
    }
}