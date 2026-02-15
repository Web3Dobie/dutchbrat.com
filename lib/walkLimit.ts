// lib/walkLimit.ts - Walk limit enforcement during multi-day sitting bookings
// When a multi-day sitting is active, limits the number of walk bookings per day.
// Admin create-booking bypasses this check entirely.

import { Pool } from 'pg';

export interface WalkLimitResult {
    hasActiveSitting: boolean;
    walkLimit: number | null;   // null = unlimited (override or no sitting)
    currentWalkCount: number;
    limitReached: boolean;
}

/**
 * Check the walk limit status for a given date.
 *
 * 1. Is there a confirmed multi_day sitting spanning this date?
 * 2. If yes, is there a walk_limit_override for this date?
 *    - override with max_walks = NULL → unlimited
 *    - override with max_walks = N → use N
 *    - no override → use MAX_WALKS_DURING_SITTING env var (default 4)
 * 3. Count confirmed solo/quick bookings on this date
 * 4. Return whether the limit is reached
 *
 * @param pool - Database connection pool
 * @param dateStr - Date in YYYY-MM-DD format
 * @param excludeBookingId - Optional booking ID to exclude (for rescheduling)
 */
export async function getWalkLimitForDate(
    pool: Pool,
    dateStr: string,
    excludeBookingId?: number
): Promise<WalkLimitResult> {
    const client = await pool.connect();
    try {
        // 1. Check for active multi-day sitting on this date
        const sittingResult = await client.query(
            `SELECT id FROM hunters_hounds.bookings
             WHERE booking_type = 'multi_day'
               AND status = 'confirmed'
               AND start_time::date <= $1::date
               AND end_time::date >= $1::date
             LIMIT 1`,
            [dateStr]
        );

        if (sittingResult.rows.length === 0) {
            return {
                hasActiveSitting: false,
                walkLimit: null,
                currentWalkCount: 0,
                limitReached: false,
            };
        }

        // 2. Check for walk limit override on this date
        const overrideResult = await client.query(
            `SELECT max_walks FROM hunters_hounds.walk_limit_overrides
             WHERE override_date = $1::date`,
            [dateStr]
        );

        let walkLimit: number | null;

        if (overrideResult.rows.length > 0) {
            walkLimit = overrideResult.rows[0].max_walks; // null = unlimited
        } else {
            walkLimit = parseInt(process.env.MAX_WALKS_DURING_SITTING || '4', 10);
        }

        // Unlimited — no need to count
        if (walkLimit === null) {
            return {
                hasActiveSitting: true,
                walkLimit: null,
                currentWalkCount: 0,
                limitReached: false,
            };
        }

        // 3. Count confirmed walk bookings on this date
        const params: (string | number)[] = [dateStr];
        let excludeClause = '';
        if (excludeBookingId) {
            excludeClause = 'AND id != $2';
            params.push(excludeBookingId);
        }

        const walkCountResult = await client.query(
            `SELECT COUNT(*)::int as count FROM hunters_hounds.bookings
             WHERE service_type IN ('solo', 'quick')
               AND status = 'confirmed'
               AND start_time::date = $1::date
               ${excludeClause}`,
            params
        );

        const currentWalkCount = walkCountResult.rows[0].count;

        return {
            hasActiveSitting: true,
            walkLimit,
            currentWalkCount,
            limitReached: currentWalkCount >= walkLimit,
        };
    } finally {
        client.release();
    }
}
