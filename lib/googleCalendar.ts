// lib/googleCalendar.ts - Centralized Google Calendar client
import { google, calendar_v3 } from 'googleapis';
import { config } from './config';

/**
 * Singleton Google Calendar client instance
 * This ensures only one authenticated client is created across the application
 */
let calendarClient: calendar_v3.Calendar | null = null;

/**
 * Get or create the shared Google Calendar client
 *
 * Uses full calendar scope (includes read + write) since most routes
 * need write access and a singleton can only have one scope set.
 *
 * @returns Shared Calendar client instance
 */
export function getCalendar(): calendar_v3.Calendar {
  if (!calendarClient) {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    calendarClient = google.calendar({ version: 'v3', auth });

    console.log('✅ Google Calendar client created');
  }

  return calendarClient;
}

/**
 * Get the configured calendar ID from environment
 */
export function getCalendarId(): string {
  return config.googleCalendarId;
}

/**
 * Reset the calendar client (useful for testing or switching auth)
 */
export function resetCalendarClient(): void {
  calendarClient = null;
  console.log('🔄 Google Calendar client reset');
}
