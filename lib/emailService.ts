import { Resend } from "resend";
import { Pool } from "pg";

// Lazy-load Resend client to avoid module-level errors
let _resend: Resend | null = null;

function getResend(): Resend {
    if (!_resend) {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY environment variable is not set');
        }
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}

// Database connection for email lookups
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;  // Optional override for from address
    bcc?: string | string[]; // Optional additional BCC recipients
}

/**
 * Parse PostgreSQL array string to JavaScript array
 */
function parsePostgreSQLArray(pgArray: any): string[] {
    if (!pgArray) return [];

    // If it's already an array, return it
    if (Array.isArray(pgArray)) {
        return pgArray.filter(email => email && email.trim());
    }

    // If it's a string, parse PostgreSQL array format
    if (typeof pgArray === 'string') {
        // Remove curly braces and split by comma
        const arrayStr = pgArray.replace(/^\{|\}$/g, '');
        if (!arrayStr.trim()) return [];

        return arrayStr
            .split(',')
            .map(email => email.trim())
            .filter(email => email && email !== '');
    }

    return [];
}

/**
 * Get all relevant email addresses for a booking (primary + partner + secondary contacts)
 * Uses the database function to gather all emails that should receive booking notifications
 */
export async function getBookingEmails(bookingId: number): Promise<string[]> {
    const client = await pool.connect();

    try {
        const result = await client.query(
            'SELECT hunters_hounds.get_booking_emails($1) as emails',
            [bookingId]
        );

        const rawEmails = result.rows[0]?.emails;
        console.log(`[Email Service] Raw result for booking ${bookingId}:`, rawEmails);

        const emails = parsePostgreSQLArray(rawEmails);
        console.log(`[Email Service] Parsed ${emails.length} email(s) for booking ${bookingId}:`, emails);

        return emails;

    } catch (error) {
        console.error(`[Email Service] Failed to get emails for booking ${bookingId}:`, error);
        // Fallback: return empty array so caller can handle gracefully
        return [];
    } finally {
        client.release();
    }
}

/**
 * Send email to all relevant recipients for a booking
 * Automatically looks up all emails (primary + partner + secondary contacts)
 */
export async function sendBookingEmail(bookingId: number, subject: string, html: string, from?: string): Promise<void> {
    const emails = await getBookingEmails(bookingId);

    if (emails.length === 0) {
        console.warn(`[Email Service] No emails found for booking ${bookingId} - skipping email send`);
        return;
    }

    return sendEmail({
        to: emails,
        subject,
        html,
        from,
    });
}

/**
 * Centralized email service for Hunter's Hounds
 * Automatically adds business BCC and standardizes from address
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
    const defaultFrom = "Hunter's Hounds <bookings@hunters-hounds.london>";
    const businessBcc = "bookings@hunters-hounds.london";

    // Combine BCCs - always include business email
    const bccList = [businessBcc];
    if (options.bcc) {
        const additionalBcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        bccList.push(...additionalBcc);
    }

    try {
        const { data, error } = await getResend().emails.send({
            from: options.from || defaultFrom,
            to: options.to,
            bcc: bccList,
            subject: options.subject.replace(/[\r\n]+/g, ' ').trim(),
            html: options.html,
        });

        if (error) {
            console.error("[Email Service] Resend API error:", error);
            throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
        }

        const recipientList = Array.isArray(options.to) ? options.to.join(', ') : options.to;
        console.log(`[Email Service] Email sent successfully to: ${recipientList} (id: ${data?.id})`);
    } catch (error) {
        console.error("[Email Service] Failed to send email:", error);
        throw error; // Re-throw to maintain existing error handling behavior
    }
}