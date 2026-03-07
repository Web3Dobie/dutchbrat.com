export interface ParsedPayment {
    amountPounds: number;
    senderName: string;
}

// Patterns for Revolut email subjects/bodies
const PATTERNS = [
    // "You received £75.00 from John Smith"
    /You received £([\d,]+\.?\d*) from (.+)/i,
    // "John Smith sent you £75.00"
    /(.+?) sent you £([\d,]+\.?\d*)/i,
    // "Payment received: £75.00 from John Smith"
    /Payment received[:\s]+£([\d,]+\.?\d*) from (.+)/i,
    // "You've received £75.00 from John Smith"
    /You'?ve received £([\d,]+\.?\d*) from (.+)/i,
];

// Alternative patterns where sender comes first
const SENDER_FIRST_PATTERNS = [
    /(.+?) sent you £([\d,]+\.?\d*)/i,
];

export function parseRevolutEmail(subject: string, body: string): ParsedPayment | null {
    // Try subject first (most reliable), then body
    const textToSearch = [subject, body];

    for (const text of textToSearch) {
        // Clean up the text: collapse whitespace, decode HTML entities
        const cleaned = text
            .replace(/&pound;/gi, '£')
            .replace(/&#163;/g, '£')
            .replace(/\s+/g, ' ')
            .trim();

        // Try amount-first patterns
        for (const pattern of PATTERNS) {
            // Skip sender-first patterns here
            if (SENDER_FIRST_PATTERNS.some(p => p.source === pattern.source)) continue;

            const match = cleaned.match(pattern);
            if (match) {
                const amountStr = match[1].replace(',', '');
                const amountPounds = parseFloat(amountStr);
                const senderName = match[2].trim().replace(/[.!]+$/, '').trim();

                if (!isNaN(amountPounds) && senderName) {
                    return { amountPounds, senderName };
                }
            }
        }

        // Try sender-first patterns
        for (const pattern of SENDER_FIRST_PATTERNS) {
            const match = cleaned.match(pattern);
            if (match) {
                const senderName = match[1].trim().replace(/[.!]+$/, '').trim();
                const amountStr = match[2].replace(',', '');
                const amountPounds = parseFloat(amountStr);

                if (!isNaN(amountPounds) && senderName) {
                    return { amountPounds, senderName };
                }
            }
        }
    }

    return null;
}
