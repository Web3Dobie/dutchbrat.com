const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Returns age in full years. Falls back to static dog_age if no birthday.
export function calculateDogAge(birthday: string | null | undefined, fallbackAge?: number | null): number | null {
    if (birthday) {
        const birth = new Date(birthday);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        if (now.getMonth() < birth.getMonth()) age--;
        return Math.max(0, age);
    }
    return fallbackAge ?? null;
}

// Returns a human-readable age string: "4 months", "1 year", "3 years".
// Uses months when under 1 year. Falls back to static age (years only).
export function formatDogAge(birthday: string | null | undefined, fallbackAge?: number | null): string | null {
    if (birthday) {
        const birth = new Date(birthday);
        const now = new Date();
        const totalMonths =
            (now.getFullYear() - birth.getUTCFullYear()) * 12 +
            (now.getMonth() - birth.getUTCMonth());
        if (totalMonths < 12) {
            const m = Math.max(0, totalMonths);
            return m === 1 ? '1 month' : `${m} months`;
        }
        const years = Math.floor(totalMonths / 12);
        return years === 1 ? '1 year' : `${years} years`;
    }
    if (fallbackAge != null) {
        return fallbackAge === 1 ? '1 year' : `${fallbackAge} years`;
    }
    return null;
}

// Returns "April 2021" from a DATE string
export function formatDogBirthday(birthday: string | null | undefined): string | null {
    if (!birthday) return null;
    const d = new Date(birthday);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Converts month (1-12) and year to YYYY-MM-01 string for DB storage
export function birthdayToDateString(month: number, year: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

// Parses a YYYY-MM-DD date string into { month, year } (1-indexed month)
export function parseBirthdayDate(birthday: string | null | undefined): { month: number; year: number } | null {
    if (!birthday) return null;
    const d = new Date(birthday);
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

export { MONTHS };
