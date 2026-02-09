// lib/constants.ts - Business configuration and constants
// Single source of truth for all business-related constants

/**
 * Business Contact Information
 */
export const BUSINESS_CONTACT = {
  name: "Hunter's Hounds",
  phone: '07932749772',
  phoneFormatted: '07932 749772',
  email: 'bookings@hunters-hounds.london',
  website: 'https://hunters-hounds.london',
  websiteDomain: 'hunters-hounds.london',
} as const;

/**
 * Bank Account Details (for payment instructions)
 */
export const BANK_DETAILS = {
  sortCode: '04-00-75',
  accountNumber: '19945388',
  accountName: "Hunter's Hounds",
} as const;

/**
 * Service Type IDs (normalized values for database)
 */
export const SERVICE_TYPES = {
  SOLO: 'solo',
  QUICK: 'quick',
  MEET_GREET: 'meetgreet',
  SITTING: 'sitting',
} as const;

/**
 * Service Durations (in minutes)
 */
export const SERVICE_DURATIONS = {
  MEET_GREET: 30,
  QUICK_WALK: 30,
  SOLO_WALK_1HR: 60,
  SOLO_WALK_2HR: 120,
} as const;

/**
 * Cancellation Policy
 */
export const CANCELLATION_POLICY = {
  advanceNoticeDays: 1,
  advanceNoticeHours: 2,
  cancellationFeePercent: 50,
  lateNoticeFeePercent: 100,
} as const;

/**
 * Working Hours
 */
export const WORKING_HOURS = {
  start: 8, // 8 AM
  end: 20, // 8 PM
  timezone: 'Europe/London',
} as const;

/**
 * Travel Buffer Times (in minutes)
 */
export const TRAVEL_BUFFER = {
  standard: 15,
  extended: 30,
} as const;

/**
 * Booking Limits
 */
export const BOOKING_LIMITS = {
  maxWeeksAhead: 12,
  maxRecurringBookings: 50,
  minAdvanceHours: 2,
} as const;

/**
 * Email Configuration
 */
export const EMAIL_CONFIG = {
  fromAddress: `${BUSINESS_CONTACT.name} <${BUSINESS_CONTACT.email}>`,
  bccAddress: BUSINESS_CONTACT.email,
  replyToAddress: BUSINESS_CONTACT.email,
} as const;

/**
 * URL Paths
 */
export const PATHS = {
  bookNow: '/book-now',
  dashboard: '/dog-walking/dashboard',
  cancel: '/dog-walking/cancel',
  adminDashboard: '/dog-walking/admin',
  adminManageBookings: '/dog-walking/admin/manage-bookings',
} as const;

/**
 * Cookie Names
 */
export const COOKIES = {
  customerAuth: 'customer-session',
  adminAuth: 'dog-walking-admin-auth',
} as const;

/**
 * Database Schemas
 */
export const DB_SCHEMAS = {
  huntersHounds: 'hunters_hounds',
  hunterMedia: 'hunter_media',
} as const;

/**
 * Feature Flags
 */
export const FEATURES = {
  recurringBookings: true,
  multiDayBooking: true,
  newsletter: true,
  notionIntegration: true,
} as const;

/**
 * Helper Functions
 */

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string = BUSINESS_CONTACT.phone): string {
  // Format as 07932 749772
  if (phone.length === 11 && phone.startsWith('0')) {
    return `${phone.slice(0, 5)} ${phone.slice(5)}`;
  }
  return phone;
}

/**
 * Get full business contact HTML for emails
 */
export function getBusinessContactHtml(): string {
  return `
    <strong>Phone:</strong> <a href="tel:${BUSINESS_CONTACT.phone}" style="color: #3b82f6;">${BUSINESS_CONTACT.phone}</a><br>
    <strong>Email:</strong> <a href="mailto:${BUSINESS_CONTACT.email}" style="color: #3b82f6;">${BUSINESS_CONTACT.email}</a><br>
    <strong>Website:</strong> <a href="${BUSINESS_CONTACT.website}" style="color: #3b82f6;">${BUSINESS_CONTACT.websiteDomain}</a>
  `.trim();
}

/**
 * Get bank details HTML for payment instructions
 */
export function getBankDetailsHtml(): string {
  return `
    <strong>Sort Code:</strong> ${BANK_DETAILS.sortCode}<br>
    <strong>Account Number:</strong> ${BANK_DETAILS.accountNumber}
  `.trim();
}

/**
 * Get full contact string for email footers
 */
export function getEmailFooterContact(): string {
  return `Phone: ${BUSINESS_CONTACT.phone} | Email: ${BUSINESS_CONTACT.email}`;
}

/**
 * Get book now URL
 */
export function getBookNowUrl(fullUrl: boolean = true): string {
  return fullUrl ? `${BUSINESS_CONTACT.website}${PATHS.bookNow}` : PATHS.bookNow;
}
