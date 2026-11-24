// lib/sharedWalk.ts - Shared walks: two dogs from two households on one walk.
//
// A shared walk is two ordinary 'solo' booking rows, one per household, that
// point at the same hunters_hounds.shared_walks row through
// bookings.shared_walk_id. See sql/create_shared_walks.sql for why.

import { getServiceDisplayName } from '@/lib/serviceTypes';

/**
 * SQL for the name(s) of the OTHER household's dog(s) on a shared walk, or
 * NULL when the booking is not shared or the partner has cancelled.
 * `alias` is the bookings table alias in the surrounding query.
 */
export function sharedWithSql(alias = 'b'): string {
    return `(
        SELECT string_agg(pd.dog_name, ' & ' ORDER BY pd.dog_name)
          FROM hunters_hounds.bookings pb
          JOIN hunters_hounds.dogs pd ON pd.id IN (pb.dog_id_1, pb.dog_id_2)
         WHERE ${alias}.shared_walk_id IS NOT NULL
           AND pb.shared_walk_id = ${alias}.shared_walk_id
           AND pb.id <> ${alias}.id
           AND pb.status <> 'cancelled'
    )`;
}

/** "Shared Walk" for a shared booking, otherwise the usual service name. */
export function walkDisplayName(serviceType: string, sharedWalkId: number | null | undefined): string {
    return sharedWalkId ? 'Shared Walk' : getServiceDisplayName(serviceType);
}

/** Shown to a client who tries to move or change one half of a shared walk. */
export const SHARED_WALK_LOCKED_MESSAGE =
    "This is a shared walk with another dog, so it can't be changed online. Please message Ernesto and he will sort it out for both of you.";
