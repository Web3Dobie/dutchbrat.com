import { NextResponse, type NextRequest } from "next/server";
import {
    format,
    addDays,
    addWeeks,
    getDay,
    parse,
    startOfDay,
    endOfDay,
    isBefore,
    max,
} from "date-fns";
import { TZDate } from "@date-fns/tz";
import { getPool } from '@/lib/database';
import { getCalendar, getCalendarId } from '@/lib/googleCalendar';
import { getWalkLimitForDate } from '@/lib/walkLimit';

// --- Configuration ---
const TIMEZONE = "Europe/London";
const TRAVEL_BUFFER_MINUTES = 15;
const WORKING_HOURS_START = 8;
const WORKING_HOURS_END = 20;
const MAX_WEEKS_AHEAD = 12;

// --- Database Connection ---
const pool = getPool();

// --- Google Calendar ---
const calendar = getCalendar();

interface TimeRange {
    start: Date;
    end: Date;
}

interface AvailableDate {
    date: string; // YYYY-MM-DD
    displayDate: string; // "Mon 10 Feb"
    time: string; // HH:mm
    status: 'available';
}

interface ConflictingDate {
    date: string;
    displayDate: string;
    requestedTime: string;
    status: 'conflict';
    reason: string;
    alternatives: Array<{
        time: string;
        displayTime: string;
    }>;
}

interface BlockedDate {
    date: string;
    displayDate: string;
    status: 'blocked';
    reason: string;
}

interface CheckAvailabilityRequest {
    owner_id: number;
    service_type: string;
    duration_minutes: number;
    recurrence_pattern: 'weekly' | 'biweekly' | 'custom';
    days_of_week?: number[]; // ISO weekday: 1=Mon, 7=Sun
    preferred_time: string; // HH:mm format
    start_date: string; // YYYY-MM-DD
    weeks_ahead: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: CheckAvailabilityRequest = await request.json();
        const {
            owner_id,
            service_type,
            duration_minutes,
            recurrence_pattern,
            days_of_week,
            preferred_time,
            start_date,
            weeks_ahead,
        } = body;

        // Validate required fields
        if (!owner_id || !service_type || !duration_minutes || !recurrence_pattern || !preferred_time || !start_date) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate weeks_ahead
        const validatedWeeksAhead = Math.min(weeks_ahead || 12, MAX_WEEKS_AHEAD);

        // Get travel buffer based on owner's extended_travel_time preference
        let travelBufferMinutes = TRAVEL_BUFFER_MINUTES;
        const dbClient = await pool.connect();
        try {
            const ownerResult = await dbClient.query(
                'SELECT extended_travel_time FROM hunters_hounds.owners WHERE id = $1',
                [owner_id]
            );
            if (ownerResult.rows[0]?.extended_travel_time === true) {
                travelBufferMinutes = 30;
            }
        } finally {
            dbClient.release();
        }

        // Generate all target dates based on recurrence pattern
        const targetDates = generateTargetDates(
            start_date,
            validatedWeeksAhead,
            recurrence_pattern,
            days_of_week
        );

        // Check availability for each date
        const availableDates: AvailableDate[] = [];
        const conflictingDates: ConflictingDate[] = [];
        const blockedDates: BlockedDate[] = [];

        // Parse preferred time
        const [prefHour, prefMinute] = preferred_time.split(':').map(Number);

        for (const dateStr of targetDates) {
            const targetDate = new TZDate(dateStr, TIMEZONE);
            const dayOfWeek = getDay(targetDate);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Check if it's a weekend (walks not available)
            if (isWeekend) {
                blockedDates.push({
                    date: dateStr,
                    displayDate: format(targetDate, "EEE d MMM"),
                    status: 'blocked',
                    reason: 'Walks not available on weekends'
                });
                continue;
            }

            // Check walk limit during multi-day sitting
            const limitResult = await getWalkLimitForDate(pool, dateStr);
            if (limitResult.limitReached) {
                blockedDates.push({
                    date: dateStr,
                    displayDate: format(targetDate, "EEE d MMM"),
                    status: 'blocked',
                    reason: `Walk limit reached (${limitResult.currentWalkCount}/${limitResult.walkLimit} during active sitting)`
                });
                continue;
            }

            // Get availability for this date
            const availability = await getDateAvailability(
                targetDate,
                duration_minutes,
                travelBufferMinutes
            );

            // Check if preferred time fits
            const preferredStart = new TZDate(targetDate, TIMEZONE);
            preferredStart.setHours(prefHour, prefMinute, 0, 0);
            const preferredEnd = new Date(preferredStart.getTime() + duration_minutes * 60000);

            const fitsPreferred = availability.some(range =>
                range.start.getTime() <= preferredStart.getTime() &&
                range.end.getTime() >= preferredEnd.getTime()
            );

            if (fitsPreferred) {
                availableDates.push({
                    date: dateStr,
                    displayDate: format(targetDate, "EEE d MMM"),
                    time: preferred_time,
                    status: 'available'
                });
            } else {
                // Find alternative times
                const alternatives = findAlternativeTimes(
                    availability,
                    duration_minutes,
                    prefHour
                );

                if (alternatives.length > 0) {
                    conflictingDates.push({
                        date: dateStr,
                        displayDate: format(targetDate, "EEE d MMM"),
                        requestedTime: preferred_time,
                        status: 'conflict',
                        reason: 'Requested time not available',
                        alternatives: alternatives // Show all available alternatives
                    });
                } else {
                    blockedDates.push({
                        date: dateStr,
                        displayDate: format(targetDate, "EEE d MMM"),
                        status: 'blocked',
                        reason: 'Fully booked on this date'
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                total_requested: targetDates.length,
                available: availableDates.length,
                conflicts: conflictingDates.length,
                blocked: blockedDates.length,
            },
            available_dates: availableDates,
            conflicting_dates: conflictingDates,
            blocked_dates: blockedDates,
        });

    } catch (error) {
        console.error("Error checking recurring availability:", error);
        return NextResponse.json(
            { error: "Failed to check availability" },
            { status: 500 }
        );
    }
}

/**
 * Generate all target dates based on recurrence pattern
 */
function generateTargetDates(
    startDateStr: string,
    weeksAhead: number,
    pattern: 'weekly' | 'biweekly' | 'custom',
    daysOfWeek?: number[]
): string[] {
    const dates: string[] = [];
    const startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
    const endDate = addWeeks(startDate, weeksAhead);

    if (pattern === 'weekly') {
        // Same day every week
        let current = startDate;
        while (isBefore(current, endDate)) {
            dates.push(format(current, 'yyyy-MM-dd'));
            current = addWeeks(current, 1);
        }
    } else if (pattern === 'biweekly') {
        // Same day every 2 weeks
        let current = startDate;
        while (isBefore(current, endDate)) {
            dates.push(format(current, 'yyyy-MM-dd'));
            current = addWeeks(current, 2);
        }
    } else if (pattern === 'custom' && daysOfWeek && daysOfWeek.length > 0) {
        // Custom days of week (e.g., Mon, Wed, Fri)
        let current = startDate;
        while (isBefore(current, endDate)) {
            const currentIsoDay = getDay(current) === 0 ? 7 : getDay(current); // Convert to ISO (1-7)
            if (daysOfWeek.includes(currentIsoDay)) {
                dates.push(format(current, 'yyyy-MM-dd'));
            }
            current = addDays(current, 1);
        }
    }

    return dates;
}

/**
 * Get available time ranges for a specific date
 */
async function getDateAvailability(
    targetDate: Date,
    durationMinutes: number,
    travelBufferMinutes: number
): Promise<TimeRange[]> {
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Fetch Google Calendar events
    const res = await calendar.events.list({
        calendarId: getCalendarId(),
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
    });

    const busyEvents = res.data.items || [];

    // Check for all-day blocking events (non-Hunter's Hounds events)
    const hasAllDayBlock = busyEvents.some((event) => {
        if (event.start?.date && event.end?.date) {
            // All-day event detected - check if it's a Hunter's Hounds business event
            const description = event.description || '';
            const summary = event.summary || '';

            // Allow walks during Dog Sitting events (check both summary and description)
            // Standardized format: summary includes "Dog Sitting" and description has "Booking Type: Multi-Day"
            // Legacy format: summary includes "Multi-Day Dog Sitting" or description has "Multi-day booking"
            if (summary.includes('Multi-Day Dog Sitting')) return false;
            if (summary.includes('Dog Sitting')) return false;
            if (description.includes('Multi-day booking')) return false;
            if (description.includes('Booking Type: Multi-Day')) return false;

            // Any other all-day event is a blocking event (vacation, personal time, etc.)
            return true;
        }
        return false;
    });

    // If there's an all-day block on this date, return no availability
    if (hasAllDayBlock) {
        return [];
    }

    // Define working hours
    const workDayStart = new TZDate(targetDate, TIMEZONE);
    workDayStart.setHours(WORKING_HOURS_START, 0, 0, 0);
    const workDayEnd = new TZDate(targetDate, TIMEZONE);
    workDayEnd.setHours(WORKING_HOURS_END, 0, 0, 0);

    // Process and pad busy events (only timed events)
    const paddedBusyTimes: TimeRange[] = busyEvents
        .filter((event) => event.start?.dateTime && event.end?.dateTime)
        .filter((event) => {
            // Skip multi-day and long single-day sitting (allow walks during these)
            const description = event.description || '';
            const summary = event.summary || '';

            // Multi-day sitting: standardized and legacy format checks
            // Standardized: "Booking Type: Multi-Day" in description
            // Legacy: "Multi-Day Dog Sitting" in summary or "Multi-day booking" in description
            if (summary.includes('Multi-Day Dog Sitting')) return false;
            if (description.includes('Multi-day booking')) return false;
            if (description.includes('Booking Type: Multi-Day')) return false;

            // Single-day long sitting (6+ hours): has "Dog Sitting" in summary and duration in description
            if (summary.includes('Dog Sitting')) {
                // Check duration from description
                // Standardized format: "Duration: 6 hours" or "Duration: 360 minutes"
                // Legacy format: same pattern
                const minutesMatch = description.match(/Duration:\s*(\d+)\s*minutes/i);
                const hoursMatch = description.match(/Duration:\s*(\d+)\s*hours?/i);

                if (minutesMatch) {
                    const minutes = parseInt(minutesMatch[1], 10);
                    if (minutes >= 360) return false; // 6+ hours
                } else if (hoursMatch) {
                    const hours = parseInt(hoursMatch[1], 10);
                    if (hours >= 6) return false;
                }
            }

            return true;
        })
        .map((event) => {
            const start = new Date(event.start!.dateTime!);
            const end = new Date(event.end!.dateTime!);

            const isFirstBooking = start.getTime() === workDayStart.getTime();
            const isLastBooking = end.getTime() === workDayEnd.getTime();

            const paddedStart = isFirstBooking
                ? start
                : new Date(start.getTime() - travelBufferMinutes * 60000);
            const paddedEnd = isLastBooking
                ? end
                : new Date(end.getTime() + travelBufferMinutes * 60000);

            return { start: paddedStart, end: paddedEnd };
        });

    // Merge overlapping busy times
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

    // Calculate free ranges
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

    // Filter out ranges too short for the requested duration
    return availableRanges.filter(range => {
        const rangeDuration = (range.end.getTime() - range.start.getTime()) / 60000;
        return rangeDuration >= durationMinutes;
    });
}

/**
 * Find alternative times within available ranges
 */
function findAlternativeTimes(
    availableRanges: TimeRange[],
    durationMinutes: number,
    preferredHour: number
): Array<{ time: string; displayTime: string }> {
    const alternatives: Array<{ time: string; displayTime: string; distance: number }> = [];

    for (const range of availableRanges) {
        // Generate possible start times (every 30 minutes)
        let current = new Date(range.start);
        while (current.getTime() + durationMinutes * 60000 <= range.end.getTime()) {
            const timeStr = format(current, 'HH:mm');
            const distance = Math.abs(current.getHours() - preferredHour);

            alternatives.push({
                time: timeStr,
                displayTime: format(current, 'h:mm a'),
                distance
            });

            current = new Date(current.getTime() + 30 * 60000); // 30-minute increments
        }
    }

    // Sort by distance from preferred time, then by time
    alternatives.sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        return a.time.localeCompare(b.time);
    });

    return alternatives.map(({ time, displayTime }) => ({ time, displayTime }));
}
