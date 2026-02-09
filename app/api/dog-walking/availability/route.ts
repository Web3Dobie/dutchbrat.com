import { NextResponse, type NextRequest } from "next/server";
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
import { getPool } from '@/lib/database';
import { getCalendar, getCalendarId } from '@/lib/googleCalendar';

// --- Database Connection (for exclude_booking_id lookup) ---
const pool = getPool();

// --- Configuration ---
const TIMEZONE = "Europe/London";
const TRAVEL_BUFFER_MINUTES = 15;

// Walk services working hours (dog sitting has its own API)
const WORKING_HOURS_START = 8;   // 8:00 AM
const WORKING_HOURS_END = 20;    // 8:00 PM

// --- Google Calendar ---
const calendar = getCalendar();

interface TimeRange {
    start: Date;
    end: Date;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dateQuery = searchParams.get("date"); // e.g., "2023-10-31"
    const serviceType = searchParams.get("service_type"); // NEW: Get service type
    const excludeBookingId = searchParams.get("exclude_booking_id"); // For rescheduling: exclude original booking
    const ownerId = searchParams.get("owner_id"); // For extended travel time lookup

    if (!dateQuery) {
        return NextResponse.json(
            { error: "Date parameter is required" },
            { status: 400 }
        );
    }

    try {
        // Determine travel buffer based on client's extended_travel_time preference
        let travelBufferMinutes = TRAVEL_BUFFER_MINUTES; // default 15 min

        // If exclude_booking_id provided, look up its Google Calendar event ID
        let excludedEventId: string | null = null;

        // Use a single DB connection for both queries
        const dbClient = await pool.connect();
        try {
            // Look up owner's extended_travel_time preference if owner_id provided
            if (ownerId) {
                const ownerResult = await dbClient.query(
                    'SELECT extended_travel_time FROM hunters_hounds.owners WHERE id = $1',
                    [parseInt(ownerId)]
                );
                if (ownerResult.rows[0]?.extended_travel_time === true) {
                    travelBufferMinutes = 30; // Extended travel time for clients outside catchment area
                }
            }

            // Look up excluded event ID for rescheduling
            if (excludeBookingId) {
                const result = await dbClient.query(
                    'SELECT google_event_id FROM hunters_hounds.bookings WHERE id = $1',
                    [parseInt(excludeBookingId)]
                );
                if (result.rows.length > 0 && result.rows[0].google_event_id) {
                    excludedEventId = result.rows[0].google_event_id;
                }
            }
        } finally {
            dbClient.release();
        }
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
            calendarId: getCalendarId(),
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        // Filter out the excluded event (for rescheduling)
        const busyEvents = (res.data.items || []).filter(event =>
            !excludedEventId || event.id !== excludedEventId
        );

        // 5. Define working hours for walk services (9:00-20:00)
        const workDayStart = new TZDate(targetDate, TIMEZONE);
        workDayStart.setHours(WORKING_HOURS_START, 0, 0, 0);

        const workDayEnd = new TZDate(targetDate, TIMEZONE);
        workDayEnd.setHours(WORKING_HOURS_END, 0, 0, 0);

        // 6. Sanitize and "Pad" all busy events with conditional logic
        const paddedBusyTimes: TimeRange[] = busyEvents
            .filter((event) => event.start?.dateTime && event.end?.dateTime)
            // Skip dog sitting events where walks can occur:
            // - Multi-day sitting: dog stays at home, walker can go out to walk other dogs
            // - Single-day sitting (6+ hours): long enough that dog can be left at home
            // Short single-day sitting (<6 hours) still blocks walks
            .filter((event) => {
                const description = event.description || '';

                // Multi-day sitting: EXCLUDE (allow walks)
                if (description.includes('Multi-Day Dog Sitting')) {
                    return false;
                }

                // Single-day sitting 6+ hours: EXCLUDE (allow walks)
                if (description.includes('Single-Day Dog Sitting')) {
                    // Extract duration from description (e.g., "Duration: 9 hours")
                    const durationMatch = description.match(/Duration:\s*(\d+)\s*hours?/i);
                    if (durationMatch) {
                        const hours = parseInt(durationMatch[1], 10);
                        if (hours >= 6) {
                            return false; // Long sitting - allow walks
                        }
                    }
                }

                return true; // Include everything else (blocks walks)
            })
            .map((event) => {
                const start = new Date(event.start!.dateTime!);
                const end = new Date(event.end!.dateTime!);

                // Check if event starts at the beginning of the workday
                const isFirstBooking = start.getTime() === workDayStart.getTime();

                // Check if event ends at the end of the workday
                const isLastBooking = end.getTime() === workDayEnd.getTime();

                // Conditionally apply buffers (using dynamic travel buffer based on client preference)
                const paddedStart = isFirstBooking
                    ? start // Don't add *before* buffer
                    : new Date(start.getTime() - travelBufferMinutes * 60000);

                const paddedEnd = isLastBooking
                    ? end // Don't add *after* buffer
                    : new Date(end.getTime() + travelBufferMinutes * 60000);

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