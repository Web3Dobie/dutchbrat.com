// lib/pricing.ts — date-aware price books
//
// Prices change on a date. A booking must be priced by the date of the WALK,
// not by the date the booking was created, because:
//
//   1. A recurring series created in December can run well into January, and
//      each booking in it must carry the price for its own date.
//   2. Adding or removing a dog from a future booking re-prices it, and must
//      use that booking's date rather than today's.
//
// So every price function takes a required `when`. It is deliberately NOT
// optional-with-a-default: an optional parameter would let every existing call
// site keep compiling while silently pricing off "now", which is the bug this
// module exists to prevent. If you are adding a call and do not know which date
// to pass, that is the thing to work out — not a reason to reach for new Date().
//
// Rates effective 1 Jan 2027 approved 16 Nov 2026. Previous rates had been
// unchanged since at least October 2025.
//
// Sittings are NOT priced automatically — see SITTING_GUIDE at the bottom. They
// are quoted by hand because long stays are discounted case by case.

export type DogCount = 1 | 2;
export type WalkDuration = 30 | 60 | 120;

interface ByDogCount {
    readonly 1: number;
    readonly 2: number;
}

export interface SittingBand {
    /** Upper bound in hours, inclusive. null = no upper bound (full day). */
    readonly maxHours: number | null;
    readonly label: string;
    readonly beforeEvening: number;
    readonly fromEvening: number;
}

export interface PriceBook {
    /** London calendar date, inclusive, 'YYYY-MM-DD'. */
    readonly effectiveFrom: string;
    readonly label: string;
    readonly walk: Readonly<Record<WalkDuration, ByDogCount>>;
    /** Pooled walk: two dogs, two households, one walk. Price is PER OWNER. */
    readonly pooled: Readonly<Partial<Record<WalkDuration, number>>>;
    readonly sitting: {
        readonly bands: readonly SittingBand[];
        readonly overnightPerNight: number;
        /** A sitting STARTING at or after this hour takes the evening column. */
        readonly eveningFromHour: number;
        readonly minimumHours: number;
    };
    /** Loyalty: a free walk is valued at the nearest of these. */
    readonly rewardTiers: readonly number[];
}

/**
 * Oldest first. To change prices, append a book — never edit a past one, or
 * historical bookings stop being reproducible.
 */
const PRICE_BOOKS: readonly PriceBook[] = [
    {
        effectiveFrom: "2000-01-01",
        label: "Rates to 31 Dec 2026",
        walk: {
            30: { 1: 10.0, 2: 14.0 },
            60: { 1: 17.5, 2: 25.0 },
            120: { 1: 25.0, 2: 32.5 },
        },
        pooled: {},
        sitting: {
            bands: [
                { maxHours: 2, label: "Up to 2 hours", beforeEvening: 25.0, fromEvening: 35.0 },
                { maxHours: 4, label: "Up to 4 hours", beforeEvening: 35.0, fromEvening: 45.0 },
                { maxHours: 6, label: "Up to 6 hours", beforeEvening: 45.0, fromEvening: 55.0 },
                { maxHours: null, label: "Full day", beforeEvening: 55.0, fromEvening: 55.0 },
            ],
            overnightPerNight: 55.0,
            eveningFromHour: 18,
            minimumHours: 2,
        },
        rewardTiers: [10.0, 17.5, 25.0, 32.5],
    },
    {
        effectiveFrom: "2027-01-01",
        label: "Rates from 1 Jan 2027",
        walk: {
            30: { 1: 12.5, 2: 20.0 },
            60: { 1: 20.0, 2: 30.0 },
            120: { 1: 32.5, 2: 50.0 },
        },
        pooled: { 60: 17.5, 120: 27.5 },
        sitting: {
            bands: [
                { maxHours: 2, label: "Up to 2 hours", beforeEvening: 32.5, fromEvening: 42.5 },
                { maxHours: 4, label: "Up to 4 hours", beforeEvening: 42.5, fromEvening: 52.5 },
                { maxHours: 6, label: "Up to 6 hours", beforeEvening: 52.5, fromEvening: 62.5 },
                { maxHours: null, label: "Full day", beforeEvening: 62.5, fromEvening: 62.5 },
            ],
            overnightPerNight: 75.0,
            eveningFromHour: 18,
            minimumHours: 2,
        },
        // Two-dog prices are now distinct per duration, so every cell is a tier.
        rewardTiers: [12.5, 17.5, 20.0, 27.5, 30.0, 32.5, 50.0],
    },
] as const;

/**
 * The London calendar date of an instant, as 'YYYY-MM-DD'.
 *
 * Price boundaries are calendar dates in London, not UTC instants: a walk at
 * 00:30 on 1 Jan is on the new book even where the server runs in another zone.
 * en-CA formats as YYYY-MM-DD, which sorts lexicographically.
 */
export function londonDate(when: Date | string): string {
    const d = typeof when === "string" ? new Date(when) : when;
    if (Number.isNaN(d.getTime())) {
        throw new Error(`pricing: invalid date ${String(when)}`);
    }
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

/** The book in force on `when`. */
export function priceBookFor(when: Date | string): PriceBook {
    const day = londonDate(when);
    let found: PriceBook | null = null;
    for (const book of PRICE_BOOKS) {
        if (book.effectiveFrom <= day) found = book;
    }
    // PRICE_BOOKS starts in 2000, so this only fires for an absurd date.
    if (!found) {
        throw new Error(`pricing: no price book covers ${day}`);
    }
    return found;
}

/** Every book, for an admin view of what changes when. */
export function allPriceBooks(): readonly PriceBook[] {
    return PRICE_BOOKS;
}

function normaliseDogCount(n: number): DogCount {
    return n >= 2 ? 2 : 1;
}

/** 60 or 120 minute solo walk. Returns 0 for an unknown duration. */
export function getSoloWalkPrice(
    duration: number,
    dogCount: number,
    when: Date | string
): number {
    if (duration !== 60 && duration !== 120) return 0;
    return priceBookFor(when).walk[duration][normaliseDogCount(dogCount)];
}

/** 30 minute quick walk. */
export function getQuickWalkPrice(dogCount: number, when: Date | string): number {
    return priceBookFor(when).walk[30][normaliseDogCount(dogCount)];
}

/** Any walk duration, one lookup. Returns 0 for an unknown duration. */
export function getWalkPrice(
    duration: number,
    dogCount: number,
    when: Date | string
): number {
    if (duration !== 30 && duration !== 60 && duration !== 120) return 0;
    return priceBookFor(when).walk[duration][normaliseDogCount(dogCount)];
}

/** Pooled walk, PER OWNER. Returns null where the book has no pooled rate. */
export function getPooledWalkPrice(
    duration: number,
    when: Date | string
): number | null {
    if (duration !== 30 && duration !== 60 && duration !== 120) return null;
    return priceBookFor(when).pooled[duration] ?? null;
}

export function getSoloWalkOptions(when: Date | string) {
    const book = priceBookFor(when);
    return ([60, 120] as const).map((duration) => ({
        duration,
        pricing: { oneDog: book.walk[duration][1], twoDogs: book.walk[duration][2] },
    }));
}

export function formatPrice(price: number | null): string {
    if (price === null) return "POA";
    if (price === 0) return "FREE";
    return `£${price.toFixed(2)}`;
}

export function formatSoloWalkPrice(
    duration: number,
    dogCount: number,
    when: Date | string
): string {
    return `£${getSoloWalkPrice(duration, dogCount, when).toFixed(2)}`;
}

export function getDurationDisplay(duration: number): string {
    if (duration === 60) return "1 Hour";
    if (duration === 120) return "2 Hours";
    return `${duration} minutes`;
}

/** Snap a client's average spend to the nearest price on the book in force. */
export function getRewardTier(avgPrice: number, when: Date | string): number {
    const tiers = priceBookFor(when).rewardTiers;
    let closest = tiers[0];
    let minDist = Math.abs(avgPrice - closest);
    for (const tier of tiers) {
        const dist = Math.abs(avgPrice - tier);
        if (dist < minDist) {
            minDist = dist;
            closest = tier;
        }
    }
    return closest;
}

// ---------------------------------------------------------------------------
// Service catalogue — display only. The booking APIs price from the functions
// above; this just drives the cards on /book-now and the admin dropdown.
// ---------------------------------------------------------------------------

export interface ServicePricing {
    id: string;
    name: string;
    description: string;
    durations?: { duration: number; pricing: { oneDog: number; twoDogs: number } }[];
    duration?: number | null;
    price?: number | null;
    twoDogPrice?: number;
    priceDisplay: string;
}

/**
 * Built per call rather than held in a module constant: this process runs for
 * weeks, so a constant evaluated at boot would still be showing December's
 * prices in January.
 */
export function serviceCatalogue(when: Date | string): Record<string, ServicePricing> {
    const book = priceBookFor(when);
    const w = book.walk;
    return {
        meetgreet: {
            id: "meetgreet",
            name: "Meet & Greet - for new clients",
            description: "Free 30-minute introduction session for new clients.",
            duration: 30,
            price: 0,
            priceDisplay: "FREE / 30-mins",
        },
        solo: {
            id: "solo",
            name: "Solo Walk",
            description: "One-on-one attention for your best friend. Choose your duration.",
            durations: [
                { duration: 60, pricing: { oneDog: w[60][1], twoDogs: w[60][2] } },
                { duration: 120, pricing: { oneDog: w[120][1], twoDogs: w[120][2] } },
            ],
            priceDisplay: `£${w[60][1].toFixed(2)} - £${w[120][2].toFixed(2)}`,
        },
        quick: {
            id: "quick",
            name: "Quick Walk (30 min)",
            description: "A fun, quick play in the park.",
            duration: 30,
            price: w[30][1],
            twoDogPrice: w[30][2],
            priceDisplay: `£${w[30][1].toFixed(2)} (1 dog) / £${w[30][2].toFixed(2)} (2 dogs) - 30 mins`,
        },
        sitting: {
            id: "sitting",
            name: "Dog Sitting (Variable)",
            description: "Customized visits with time-based pricing.",
            duration: null,
            price: null,
            priceDisplay: `From £${book.sitting.bands[0].beforeEvening.toFixed(2)}`,
        },
    };
}

export function getServicePrice(serviceId: string, when: Date | string): number | null {
    return serviceCatalogue(when)[serviceId]?.price ?? null;
}

export function requiresManualPricing(serviceId: string, when: Date | string): boolean {
    return serviceCatalogue(when)[serviceId]?.price === null;
}

export function hasDurationPricing(serviceId: string, when: Date | string): boolean {
    return serviceCatalogue(when)[serviceId]?.durations !== undefined;
}

// ---------------------------------------------------------------------------
// Sittings
// ---------------------------------------------------------------------------

/**
 * What the card says a sitting costs. This is a QUOTE, not a price: sittings
 * are entered by hand and long stays are discounted case by case, so nothing
 * writes this to price_pounds automatically. Use it to show the walker the
 * card rate while they decide.
 */
export function getSittingQuote(
    hours: number,
    startHour: number,
    when: Date | string
): { price: number; band: string; evening: boolean } {
    const { bands, eveningFromHour } = priceBookFor(when).sitting;
    const evening = startHour >= eveningFromHour;
    const band =
        bands.find((b) => b.maxHours !== null && hours <= b.maxHours) ??
        bands[bands.length - 1];
    return {
        price: evening ? band.fromEvening : band.beforeEvening,
        band: band.label,
        evening,
    };
}

/** Card rate for an overnight stay, per night. */
export function getOvernightRate(when: Date | string): number {
    return priceBookFor(when).sitting.overnightPerNight;
}
