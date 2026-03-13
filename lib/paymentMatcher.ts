import { Pool } from 'pg';

export interface MatchedOwner {
    id: number;
    owner_name: string;
    payment_preference: string;
    payment_account_name: string | null;
}

export interface MatchedBooking {
    id: number;
    service_type: string;
    start_time: Date;
    end_time: Date | null;
    price_pounds: number;
}

export interface PaymentMatchResult {
    owner: MatchedOwner;
    bookings: MatchedBooking[];
    expectedTotal: number;
    wasNewAccountName: boolean;
}

export async function matchPaymentToOwner(
    pool: Pool,
    senderName: string,
    amountPounds: number
): Promise<PaymentMatchResult | null> {
    const client = await pool.connect();

    try {
        // Tier 1: match on stored payment_account_name (most reliable)
        let ownerResult = await client.query<MatchedOwner>(
            `SELECT id, owner_name, payment_preference, payment_account_name
             FROM hunters_hounds.owners
             WHERE payment_account_name ILIKE $1
             LIMIT 1`,
            [senderName]
        );

        let wasNewAccountName = false;

        // Tier 2: fallback — match on owner_name
        if (ownerResult.rows.length === 0) {
            ownerResult = await client.query<MatchedOwner>(
                `SELECT id, owner_name, payment_preference, payment_account_name
                 FROM hunters_hounds.owners
                 WHERE owner_name ILIKE $1
                 LIMIT 1`,
                [senderName]
            );

            // If still no match, try partial first-name match
            if (ownerResult.rows.length === 0) {
                const firstName = senderName.split(' ')[0];
                ownerResult = await client.query<MatchedOwner>(
                    `SELECT id, owner_name, payment_preference, payment_account_name
                     FROM hunters_hounds.owners
                     WHERE owner_name ILIKE $1
                     LIMIT 1`,
                    [`${firstName}%`]
                );
            }

            if (ownerResult.rows.length > 0) {
                wasNewAccountName = true;
            }
        }

        if (ownerResult.rows.length === 0) {
            return null;
        }

        const owner = ownerResult.rows[0];

        // All outstanding unpaid bookings, oldest first — no date window
        const bookingsResult = await client.query(`
            SELECT id, service_type, start_time, end_time,
                   price_pounds::numeric::float8 as price_pounds
            FROM hunters_hounds.bookings
            WHERE owner_id = $1
              AND status IN ('completed', 'confirmed')
              AND price_pounds > 0
              AND COALESCE(end_time, start_time) <= NOW()
            ORDER BY COALESCE(end_time, start_time) ASC
        `, [owner.id]);
        const bookings: MatchedBooking[] = bookingsResult.rows;

        const expectedTotal = bookings.reduce((sum, b) => sum + b.price_pounds, 0);

        // If matched via fallback AND amounts match (within £0.01), auto-save the account name
        if (wasNewAccountName && Math.abs(amountPounds - expectedTotal) < 0.01) {
            await client.query(
                `UPDATE hunters_hounds.owners SET payment_account_name = $1 WHERE id = $2`,
                [senderName, owner.id]
            );
            owner.payment_account_name = senderName;
        }

        return { owner, bookings, expectedTotal, wasNewAccountName };

    } finally {
        client.release();
    }
}
