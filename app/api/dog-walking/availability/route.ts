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
    getDay, // NEW: Import getDay for weekend checking
} from "date-fns";
import {
    TZDate
} from "@date-fns/tz";

// --- Configuration ---
const TIMEZONE = "Europe/London";
const TRAVEL_BUFFER_MINUTES = 15;

// Walk services working hours (dog sitting has its own API)
const WORKING_HOURS_START = 8;   // 8:00 AM
const WORKING_HOURS_END = 20;    // 8:00 PM

// --- Authentication ---
const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
});
const calendar = google.calendar({ version: "v3", auth });

interface TimeRange {
    start: Date;
    end: Date;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dateQuery = searchParams.get("date"); // e.g., "2023-10-31"
    const serviceType = searchParams.get("service_type"); // NEW: Get service type

    if (!dateQuery) {
        return NextResponse.json(
            { error: "Date parameter is required" },
            { status: 400 }
        );
    }

    try {
        // 1. Get the target date using the TZDate constructor
        const targetDate = new TZDate(dateQuery, TIMEZONE);

        // NEW: 2. Check if it's a weekend for walk services
        const dayOfWeek = getDay(targetDate); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // NEW: Block weekends for walk services
        if (isWeekend && serviceType && (serviceType.includes('walk') || serviceType.includes('greet'))) {
            return NextResponse.json({
                availableRanges: [],
                message: "Walk services are only available Monday to Friday"
            });
        }

        // 3. Define the day's boundaries
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        // 4. Fetch Google Calendar events
        const res = await calendar.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const busyEvents = res.data.items || [];

        // 5. Define working hours for walk services (9:00-20:00)
        const workDayStart = new TZDate(targetDate, TIMEZONE);
        workDayStart.setHours(WORKING_HOURS_START, 0, 0, 0);

        const workDayEnd = new TZDate(targetDate, TIMEZONE);
        workDayEnd.setHours(WORKING_HOURS_END, 0, 0, 0);

        // 6. Sanitize and "Pad" all busy events with conditional logic
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

        // 7. Merge overlapping padded events
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

        // 8. Invert: Find free ranges within working hours
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

        // 9. Format the final ranges
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