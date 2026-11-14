export type Tier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'none';

export const TIER_THRESHOLDS = [
    { tier: 'diamond' as Tier, min: 15000, paws: 8 },
    { tier: 'gold' as Tier,    min: 10000, paws: 4 },
    { tier: 'silver' as Tier,  min: 5000,  paws: 2 },
    { tier: 'bronze' as Tier,  min: 2500,  paws: 1 },
];

export const TIER_COLOURS: Record<Tier, string> = {
    diamond: '#a78bfa', // violet
    gold:    '#f59e0b', // amber
    silver:  '#9ca3af', // grey
    bronze:  '#b45309', // brown
    none:    '#374151', // dark grey
};

export const TIER_LABELS: Record<Tier, string> = {
    diamond: 'Diamond',
    gold:    'Gold',
    silver:  'Silver',
    bronze:  'Bronze',
    none:    '—',
};

export function getTierFromSteps(steps: number): Tier {
    for (const { tier, min } of TIER_THRESHOLDS) {
        if (steps >= min) return tier;
    }
    return 'none';
}

export function getBasePawsFromSteps(steps: number): number {
    for (const { min, paws } of TIER_THRESHOLDS) {
        if (steps >= min) return paws;
    }
    return 0;
}

export function getPawsWithMultiplier(basePaws: number, adsWatched: 0 | 1 | 2): number {
    const multiplier = adsWatched === 2 ? 1.5 : adsWatched === 1 ? 1.25 : 1;
    return Math.round(basePaws * multiplier * 100) / 100;
}

export function getPrizeForRank(rank: 1 | 2 | 3): string {
    return rank === 1 ? 'Toy' : 'Treat bag';
}

// Returns the Monday of the ISO week containing the given date
export function getWeekStart(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday = start
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

export function formatWeekStart(date: Date): string {
    return date.toISOString().split('T')[0];
}
