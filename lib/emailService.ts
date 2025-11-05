import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;  // Optional override for from address
    bcc?: string | string[]; // Optional additional BCC recipients
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
        await resend.emails.send({
            from: options.from || defaultFrom,
            to: options.to,
            bcc: bccList,
            subject: options.subject,
            html: options.html,
        });

        console.log(`Email sent successfully to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    } catch (error) {
        console.error("Failed to send email:", error);
        throw error; // Re-throw to maintain existing error handling behavior
    }
}