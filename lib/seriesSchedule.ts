import { TZDate } from '@date-fns/tz';

export const LONDON = 'Europe/London';

/** 1 = Monday … 7 = Sunday, in the given timezone. */
export function isoDayOfWeek(when: Date, timeZone: string = LONDON): number {
    const local = new TZDate(when, timeZone);
    const dow = local.getDay();
    return dow === 0 ? 7 : dow;
}

/** Midnight on the Monday of the local week containing `when`. */
export function mondayOf(when: Date, timeZone: string = LONDON): TZDate {
    const local = new TZDate(when, timeZone);
    const monday = new TZDate(local, timeZone);
    monday.setDate(monday.getDate() - (isoDayOfWeek(when, timeZone) - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/**
 * Move a booking to a different weekday and/or time WITHIN ITS OWN WEEK.
 *
 * This is what "move the series from Friday to Thursday" means: each walk stays
 * in the week it was already in, so the run neither gains nor loses dates and
 * no walk jumps over another. Rebuilding the dates from the series start
 * instead would silently change the count whenever a date had been skipped or
 * rescheduled by hand.
 *
 * Working in London wall-clock time is deliberate: a 15:00 walk stays a 15:00
 * walk across the March and October clock changes, which is what both the
 * client and the calendar expect.
 */
export function shiftWithinWeek(
    from: Date,
    opts: { targetDow?: number | null; time?: string | null; timeZone?: string }
): Date {
    const timeZone = opts.timeZone ?? LONDON;
    const local = new TZDate(from, timeZone);
    const targetDow = opts.targetDow ?? isoDayOfWeek(from, timeZone);

    const shifted = mondayOf(from, timeZone);
    shifted.setDate(shifted.getDate() + (targetDow - 1));

    let hours = local.getHours();
    let minutes = local.getMinutes();
    if (opts.time) {
        const [hh, mm] = opts.time.split(':').map(Number);
        if (Number.isFinite(hh) && Number.isFinite(mm)) {
            hours = hh;
            minutes = mm;
        }
    }
    shifted.setHours(hours, minutes, 0, 0);

    return new Date(shifted.getTime());
}
