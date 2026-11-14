import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { matchPaymentToOwner, type MatchedBooking } from '@/lib/paymentMatcher';
import { sendTelegramNotification } from '@/lib/telegram';
import { format } from 'date-fns';
import { TZDate } from "@date-fns/tz";
import { getServiceDisplayName } from '@/lib/serviceTypes';

const pool = getPool();

interface PaymentNotifyRequest {
    raw_title?: string;
    raw_text?: string;
}

export async function POST(request: NextRequest) {
    // Bearer token auth — called by Tasker on the phone, not a browser
    // Also accepts ?secret= query param since Tasker cannot send custom Authorization headers
    const authHeader = request.headers.get('Authorization');
    const urlSecret = request.nextUrl.searchParams.get('secret');
    const secret = process.env.PAYMENT_CHECK_SECRET;

    if (!secret || (authHeader !== `Bearer ${secret}` && urlSecret !== secret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let data: PaymentNotifyRequest;
    try {
        data = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { raw_title = '', raw_text = '' } = data;

    let sender_name = '';
    let amount_pounds = NaN;

    // Bank transfer: "You've received £25.00 from Client Name. Tap to view"
    const bankMatch = raw_text.match(/received\s+\D{0,3}(\d+(?:\.\d+)?)\s+from\s+(.+?)(?:\.\s*tap\b.*)?$/i);
    if (bankMatch) {
        amount_pounds = parseFloat(bankMatch[1]);
        sender_name = bankMatch[2].replace(/\.\s*tap\b.*/i, '').trim();
    }

    // Revolut-to-Revolut: body = "Sent you £25.00", title = sender name
    if (!bankMatch) {
        const p2pMatch = raw_text.match(/sent\s+you\s+\D{0,3}(\d+(?:\.\d+)?)/i);
        if (p2pMatch) {
            amount_pounds = parseFloat(p2pMatch[1]);
            sender_name = raw_title.trim();
        }
    }

    // Monzo: "💸 £25.00 from Ernesto Becker: Sent from Revolut"
    // Check both raw_text and raw_title — Monzo may put the amount/sender in the title
    if (!bankMatch && isNaN(amount_pounds)) {
        const monzoPattern = /\D{0,3}(\d+(?:\.\d+)?)\s+from\s+(.+?):/i;
        const monzoMatch = raw_text.match(monzoPattern) || raw_title.match(monzoPattern);
        if (monzoMatch) {
            amount_pounds = parseFloat(monzoMatch[1]);
            sender_name = monzoMatch[2].trim();
        }
    }

    // Split format: amount in title ("You received £35"), name in body ("Payment received from Name. Tap for details")
    if (isNaN(amount_pounds) || !sender_name) {
        const titleAmountMatch = raw_title.match(/received\s+\D{0,3}(\d+(?:\.\d+)?)/i);
        const textNameMatch = raw_text.match(/(?:payment\s+)?received\s+from\s+(.+?)(?:\s*\.|$)/i);
        if (titleAmountMatch && textNameMatch) {
            amount_pounds = parseFloat(titleAmountMatch[1]);
            sender_name = textNameMatch[1].trim();
        }
    }

    if (!sender_name || isNaN(amount_pounds)) {
        // Silently ignore outbound notifications (e.g. Revolut "Transfer successful")
        const isOutbound = /transfer successful|has been sent|you sent|payment sent/i.test(raw_title + ' ' + raw_text);
        if (!isOutbound) {
            // Send a debug Telegram for unrecognised inbound-looking notifications
            await sendTelegramNotification(
                `⚠️ UNRECOGNISED PAYMENT NOTIFICATION\n\nTitle: ${raw_title || '(empty)'}\nText: ${raw_text || '(empty)'}\n\nPlease check and update the parser if needed.`
            );
        }
        return NextResponse.json({ ignored: true }, { status: 200 });
    }

    try {
        const matchResult = await matchPaymentToOwner(pool, sender_name, amount_pounds);

        if (!matchResult) {
            await sendTelegramNotification(
                `⚠️ UNMATCHED PAYMENT\n\nFrom: ${sender_name}\nAmount: £${amount_pounds.toFixed(2)}\n\nNo client found. Please mark manually in admin console.`
            );
            return NextResponse.json({ success: true, matched: false });
        }

        const { owner, bookings, expectedTotal, wasNewAccountName } = matchResult;

        const preferenceLabel = owner.payment_preference === 'per_service'
            ? 'per-service payer'
            : `${owner.payment_preference} payer`;

        const formatBookingLine = (b: MatchedBooking) => {
            const dateLabel = b.end_time && new Date(b.end_time).getTime() !== new Date(b.start_time).getTime()
                ? `${format(new TZDate(new Date(b.start_time), "Europe/London"), 'd MMM')}–${format(new TZDate(new Date(b.end_time), "Europe/London"), 'd MMM')}`
                : format(new TZDate(new Date(b.start_time), "Europe/London"), 'd MMM');
            return `  #${b.id} ${getServiceDisplayName(b.service_type)} ${dateLabel} £${b.price_pounds.toFixed(2)}`;
        };

        if (bookings.length === 0) {
            await sendTelegramNotification(
                `⚠️ PAYMENT RECEIVED — NO OUTSTANDING BOOKINGS\n\nFrom: ${sender_name}\nAmount: £${amount_pounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id})\nNo completed unpaid bookings found.\n\nPlease review manually.`
            );
            return NextResponse.json({ success: true, matched: true, marked_paid: [] });

        } else if (amount_pounds > expectedTotal + 0.01) {
            // Overpayment — do not mark anything paid
            const bookingLines = bookings.map(formatBookingLine).join('\n');
            await sendTelegramNotification(
                `⚠️ OVERPAYMENT — action required\n\nFrom: ${sender_name}\nAmount received: £${amount_pounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nAll outstanding bookings:\n${bookingLines}\n\nTotal outstanding: £${expectedTotal.toFixed(2)} — Overpaid by: £${(amount_pounds - expectedTotal).toFixed(2)}\nBookings NOT marked paid. Please review in admin console.`
            );
            return NextResponse.json({ success: true, matched: true, marked_paid: [] });

        } else {
            // Payment ≤ outstanding: greedy oldest-first allocation
            let remaining = amount_pounds;
            const bookingsToPay: MatchedBooking[] = [];
            for (const b of bookings) {
                if (remaining >= b.price_pounds - 0.01) {
                    bookingsToPay.push(b);
                    remaining -= b.price_pounds;
                } else {
                    break;
                }
            }

            if (bookingsToPay.length > 0) {
                const bookingIds = bookingsToPay.map(b => b.id);
                await pool.query(
                    `UPDATE hunters_hounds.bookings SET status = 'completed & paid' WHERE id = ANY($1)`,
                    [bookingIds]
                );
            }

            const paidTotal = bookingsToPay.reduce((s, b) => s + b.price_pounds, 0);
            const unpaidBookings = bookings.filter(b => !bookingsToPay.find(p => p.id === b.id));
            const remainingBalance = expectedTotal - paidTotal;
            const isFullMatch = unpaidBookings.length === 0;

            const paidLines = bookingsToPay.map(formatBookingLine).join('\n');

            let message: string;
            if (isFullMatch) {
                message = `💰 PAYMENT RECEIVED ✅\n\nFrom: ${sender_name}\nAmount: £${amount_pounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nBookings marked as paid:\n${paidLines}\n\nTotal: £${paidTotal.toFixed(2)} — Received: £${amount_pounds.toFixed(2)} ✅`;
            } else {
                const unpaidLines = unpaidBookings.map(formatBookingLine).join('\n');
                message = `💰 PARTIAL PAYMENT RECEIVED ✅\n\nFrom: ${sender_name}\nAmount: £${amount_pounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nBookings marked as paid:\n${paidLines}\n\nStill outstanding (£${remainingBalance.toFixed(2)}):\n${unpaidLines}`;
            }

            if (wasNewAccountName) {
                message += `\n\n📌 Account name '${sender_name}' saved to ${owner.owner_name}'s profile.\nFuture payments will match automatically.`;
            }

            await sendTelegramNotification(message);
            return NextResponse.json({ success: true, matched: true, marked_paid: bookingsToPay.map(b => b.id) });
        }

    } catch (error) {
        console.error('[payment-notify] Error:', error);
        return NextResponse.json(
            { error: 'Payment processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
