// lib/serviceTypes.ts - Shared utilities for service type handling

/**
 * Normalize service type for consistent database storage.
 * Converts various input formats to standardized IDs.
 *
 * @example
 * normalizeServiceType("Solo Walk (1 hour)") // returns "solo"
 * normalizeServiceType("Meet & Greet - for new clients") // returns "meetgreet"
 */
export function normalizeServiceType(serviceType: string): string {
    const lower = serviceType.toLowerCase();

    if (lower.includes('solo')) return 'solo';
    if (lower.includes('quick')) return 'quick';
    if (lower.includes('meet') || lower.includes('greet')) return 'meetgreet';
    if (lower.includes('sitting')) return 'sitting';

    return serviceType; // Return as-is if unknown
}

/**
 * Convert normalized service type to human-readable display name.
 *
 * @example
 * getServiceDisplayName("solo") // returns "Solo Walk"
 * getServiceDisplayName("meetgreet") // returns "Meet & Greet"
 */
export function getServiceDisplayName(serviceType: string): string {
    const displayMap: Record<string, string> = {
        'solo': 'Solo Walk',
        'quick': 'Quick Walk',
        'meetgreet': 'Meet & Greet',
        'sitting': 'Dog Sitting',
    };

    return displayMap[serviceType] || serviceType;
}

/**
 * Check if a service type is a Solo Walk (handles both normalized and legacy formats).
 */
export function isSoloWalk(serviceType: string): boolean {
    return serviceType === 'solo' || serviceType.toLowerCase().includes('solo');
}

/**
 * Check if a service type is Dog Sitting (handles both normalized and legacy formats).
 */
export function isDogSitting(serviceType: string): boolean {
    return serviceType === 'sitting' || serviceType.toLowerCase().includes('sitting');
}
