// Single source of truth for whether a cancellation carries a fee.
// Used by the cancel route, the cancel page's warning, and the admin console,
// so all three agree on the number the client is shown.

import { CANCELLATION_POLICY } from './constants';

export interface CancellationFeeInput {
    booking_type: string | null;
    start_time: string | Date;
    end_time: string | Date;
    price_pounds: number | string | null;
}

export interface CancellationFeeResult {
    /** True when a fee is actually payable. */
    feeApplies: boolean;
    /** The amount owed, rounded to pennies. 0 when no fee applies. */
    feePounds: number;
    /** True when this booking is long enough to fall under the notice period at all. */
    policyApplies: boolean;
    /** Whole days between now and the start. Negative once the booking has started. */
    daysUntilStart: number;
    /** Why the outcome is what it is — surfaced to the client and logged. */
    reason:
        | 'not-a-long-sitting'
        | 'outside-notice-period'
        | 'inside-notice-period-unpriced'
        | 'inside-notice-period';
}

export function calculateCancellationFee(
    booking: CancellationFeeInput,
    now: Date = new Date()
): CancellationFeeResult {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);

    const durationHours = (end.getTime() - start.getTime()) / 3_600_000;
    const daysUntilStart = Math.floor((start.getTime() - now.getTime()) / 86_400_000);

    // Walks, meet & greets and single-day sittings are always fee-free, as are
    // multi-day bookings of 2 days or less.
    const policyApplies =
        booking.booking_type === 'multi_day' &&
        durationHours > CANCELLATION_POLICY.sittingMinDurationHours;

    if (!policyApplies) {
        return { feeApplies: false, feePounds: 0, policyApplies: false, daysUntilStart, reason: 'not-a-long-sitting' };
    }

    if (daysUntilStart >= CANCELLATION_POLICY.sittingNoticeDays) {
        return { feeApplies: false, feePounds: 0, policyApplies: true, daysUntilStart, reason: 'outside-notice-period' };
    }

    // Sittings are variable-priced and sit at NULL until priced by hand, so there
    // is nothing to take a percentage of. Charge nothing rather than guess.
    const price = booking.price_pounds === null || booking.price_pounds === undefined
        ? null
        : Number(booking.price_pounds);

    if (price === null || !(price > 0)) {
        return { feeApplies: false, feePounds: 0, policyApplies: true, daysUntilStart, reason: 'inside-notice-period-unpriced' };
    }

    const feePounds = Math.round(price * (CANCELLATION_POLICY.sittingLateFeePercent / 100) * 100) / 100;
    return { feeApplies: true, feePounds, policyApplies: true, daysUntilStart, reason: 'inside-notice-period' };
}

/** Client-facing sentence explaining the outcome. */
export function describeCancellationFee(result: CancellationFeeResult): string {
    const { sittingNoticeDays, sittingLateFeePercent } = CANCELLATION_POLICY;

    switch (result.reason) {
        case 'not-a-long-sitting':
            return 'This booking can be cancelled free of charge.';
        case 'outside-notice-period':
            return `This sitting starts in ${result.daysUntilStart} days, which is more than the ${sittingNoticeDays} days' notice required. There is no cancellation fee.`;
        case 'inside-notice-period-unpriced':
            return `This sitting starts within ${sittingNoticeDays} days. It has not been priced yet, so no fee will be charged automatically — we may contact you to agree one.`;
        case 'inside-notice-period':
            return `This sitting starts in ${result.daysUntilStart} day${result.daysUntilStart === 1 ? '' : 's'}, which is inside the ${sittingNoticeDays} days' notice required. A ${sittingLateFeePercent}% cancellation fee of £${result.feePounds.toFixed(2)} applies.`;
    }
}
