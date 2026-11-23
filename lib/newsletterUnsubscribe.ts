import { getPool } from '@/lib/database';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUnsubscribeToken(token: string | null): token is string {
    return !!token && UUID.test(token);
}

/**
 * Unsubscribe whoever owns this token (a client, or a client's partner) from
 * the newsletter. Returns their email address, or null if the token matches
 * nobody. Booking emails and reminders are not affected.
 */
export async function unsubscribeByToken(token: string): Promise<string | null> {
    const pool = getPool();

    const primary = await pool.query(
        `UPDATE hunters_hounds.owners
            SET newsletter_subscribed = false
          WHERE newsletter_unsubscribe_token = $1
      RETURNING email`,
        [token]
    );
    if (primary.rows.length > 0) return primary.rows[0].email ?? '';

    const partner = await pool.query(
        `UPDATE hunters_hounds.owners
            SET partner_newsletter_subscribed = false
          WHERE partner_newsletter_unsubscribe_token = $1
      RETURNING partner_email`,
        [token]
    );
    if (partner.rows.length > 0) return partner.rows[0].partner_email ?? '';

    return null;
}
