// lib/calendarEvents.ts - Shared utilities for Google Calendar event generation

import { format } from "date-fns";

/**
 * Data required to generate a standardized Google Calendar event
 */
export interface CalendarEventData {
    // Booking details
    service_type: string;
    dogNames: string;
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    addressLabel?: string;

    // Timing
    duration_minutes?: number;
    duration_days?: number;
    booking_type: 'single' | 'multi_day';
    start_time?: Date;
    end_time?: Date;

    // Optional
    price?: number;
    notes?: string;
    status?: string;

    // Flags for special booking types
    isHistorical?: boolean;
    isRecurring?: boolean;
    seriesId?: number;
    seriesIndex?: number;
    seriesTotal?: number;
    isRescheduled?: boolean;
    oldStartTime?: Date;
}

/**
 * Generate standardized Google Calendar event summary (title)
 *
 * Format: [SERVICE_TYPE] - [DOG_NAMES] [(DURATION/DAYS)] [SERIES_BADGE]
 *
 * Examples:
 * - "Solo Walk (60min) - Max & Luna"
 * - "Multi-Day Dog Sitting - Buddy (14 days)"
 * - "Quick Walk - Charlie [Series #42-3/12]"
 */
export function generateCalendarEventSummary(data: CalendarEventData): string {
    const { service_type, dogNames, duration_minutes, duration_days, booking_type, isRecurring, seriesId, seriesIndex, seriesTotal } = data;

    let summary = `${service_type} - ${dogNames}`;

    // Add duration/days info
    if (booking_type === 'multi_day' && duration_days) {
        summary += ` (${duration_days} days)`;
    } else if (booking_type === 'single' && duration_minutes) {
        summary += ` (${duration_minutes}min)`;
    }

    // Add series badge for recurring bookings
    if (isRecurring && seriesId && seriesIndex !== undefined && seriesTotal) {
        summary += ` [Series #${seriesId}-${seriesIndex}/${seriesTotal}]`;
    }

    return summary;
}

/**
 * Generate standardized Google Calendar event description
 *
 * Consistent format across all booking channels with all relevant details
 */
export function generateCalendarEventDescription(data: CalendarEventData): string {
    const {
        service_type,
        dogNames,
        ownerName,
        phone,
        email,
        address,
        addressLabel,
        duration_minutes,
        duration_days,
        booking_type,
        start_time,
        end_time,
        price,
        notes,
        status,
        isHistorical,
        isRecurring,
        seriesId,
        seriesIndex,
        seriesTotal,
        isRescheduled,
        oldStartTime,
    } = data;

    const lines: string[] = [];

    // Header section - booking type
    if (booking_type === 'multi_day') {
        lines.push('Multi-Day Dog Sitting');
    } else if (isRecurring && seriesId) {
        lines.push(`Recurring Booking (Series #${seriesId}, Booking ${seriesIndex} of ${seriesTotal})`);
    } else {
        lines.push('BOOKING CONFIRMATION');
    }

    // Historical badge
    if (isHistorical) {
        lines.push('** HISTORICAL BOOKING **');
    }

    // Rescheduled badge
    if (isRescheduled && oldStartTime) {
        lines.push(`** RESCHEDULED FROM ${format(oldStartTime, "MMM d, yyyy 'at' h:mm a")} **`);
    }

    lines.push(''); // Blank line

    // Core booking details
    lines.push(`Owner: ${ownerName}`);
    lines.push(`Dog(s): ${dogNames}`);
    lines.push(`Service: ${service_type}`);

    // Duration info
    if (booking_type === 'multi_day' && duration_days) {
        lines.push(`Duration: ${duration_days} days`);
    } else if (duration_minutes) {
        if (duration_minutes >= 60) {
            const hours = Math.floor(duration_minutes / 60);
            const mins = duration_minutes % 60;
            lines.push(`Duration: ${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} minutes` : ''}`);
        } else {
            lines.push(`Duration: ${duration_minutes} minutes`);
        }
    }

    // Price
    if (price !== undefined && price !== null) {
        lines.push(`Price: £${price.toFixed(2)}`);
    }

    lines.push(''); // Blank line

    // Location details
    if (addressLabel) {
        lines.push(`Location: ${addressLabel}`);
    }
    lines.push(`Address: ${address}`);
    lines.push(`Phone: ${phone}`);
    lines.push(`Email: ${email}`);

    // Time details (if provided)
    if (start_time && end_time) {
        lines.push(''); // Blank line
        lines.push(`Start: ${format(start_time, "EEEE, MMMM d 'at' HH:mm")}`);
        lines.push(`End: ${format(end_time, "EEEE, MMMM d 'at' HH:mm")}`);
    }

    // Notes
    if (notes) {
        lines.push(''); // Blank line
        lines.push(`Notes: ${notes}`);
    }

    // Status
    if (status) {
        lines.push(''); // Blank line
        lines.push(`Status: ${status.toUpperCase()}`);
    }

    // Booking type label (for filtering/searching)
    lines.push(''); // Blank line
    if (booking_type === 'multi_day') {
        lines.push('Booking Type: Multi-Day');
    } else if (isRecurring) {
        lines.push('Booking Type: Recurring');
    } else {
        lines.push('Booking Type: Single Day');
    }

    return lines.join('\n');
}

/**
 * Generate complete Google Calendar event object
 *
 * Returns the full event object ready for calendar.events.insert()
 */
export function generateCalendarEvent(
    data: CalendarEventData,
    startDateTime: Date,
    endDateTime: Date,
    timezone: string = "Europe/London"
) {
    return {
        summary: generateCalendarEventSummary(data),
        description: generateCalendarEventDescription(data),
        start: {
            dateTime: startDateTime.toISOString(),
            timeZone: timezone,
        },
        end: {
            dateTime: endDateTime.toISOString(),
            timeZone: timezone,
        },
        location: data.address,
    };
}
