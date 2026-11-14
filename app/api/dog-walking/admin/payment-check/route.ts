import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { fetchUnreadRevolutEmails } from '@/lib/emailPoller';
import { parseRevolutEmail } from '@/lib/paymentParser';
import { matchPaymentToOwner, type MatchedBooking } from '@/lib/paymentMatcher';
import { sendTelegramNotification } from '@/lib/telegram';
import { format } from 'date-fns';
import { TZDate } from "@date-fns/tz";
import { getServiceDisplayName } from '@/lib/serviceTypes';

const pool = getPool();

export async function POST(request: NextRequest) {
    // Bearer token auth — this endpoint is called by cron, not a browser
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.PAYMENT_CHECK_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let processed = 0;
    let matched = 0;
    let unmatched = 0;

    try {
        const emails = await fetchUnreadRevolutEmails();

        for (const email of emails) {
            processed++;

            const parsed = parseRevolutEmail(email.subject, email.body);

            if (!parsed) {
                console.warn(`[payment-check] Could not parse email: subject="${email.subject}"`);
                await sendTelegramNotification(
                    `⚠️ UNRECOGNISED REVOLUT EMAIL FORMAT\n\nSubject: ${email.subject}\n\nPlease check the email inbox and update the parser regex if needed.`
                );
                continue;
            }

            const { amountPounds, senderName } = parsed;
            const matchResult = await matchPaymentToOwner(pool, senderName, amountPounds);

            if (!matchResult) {
                unmatched++;
                console.log(`[payment-check] No client found for sender: "${senderName}", amount: £${amountPounds.toFixed(2)}`);
                await sendTelegramNotification(
                    `⚠️ UNMATCHED PAYMENT\n\nFrom: ${senderName}\nAmount: £${amountPounds.toFixed(2)}\n\nNo client found. Please mark manually in admin console.`
                );
                continue;
            }

            matched++;
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
                // Matched owner but no outstanding completed bookings
                await sendTelegramNotification(
                    `⚠️ PAYMENT RECEIVED — NO OUTSTANDING BOOKINGS\n\nFrom: ${senderName}\nAmount: £${amountPounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id})\nNo completed unpaid bookings found.\n\nPlease review manually.`
                );

            } else if (amountPounds > expectedTotal + 0.01) {
                // Overpayment — do not mark anything paid
                const bookingLines = bookings.map(formatBookingLine).join('\n');
                await sendTelegramNotification(
                    `⚠️ OVERPAYMENT — action required\n\nFrom: ${senderName}\nAmount received: £${amountPounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nAll outstanding bookings:\n${bookingLines}\n\nTotal outstanding: £${expectedTotal.toFixed(2)} — Overpaid by: £${(amountPounds - expectedTotal).toFixed(2)}\nBookings NOT marked paid. Please review in admin console.`
                );
                console.log(`[payment-check] Overpayment for owner=${owner.owner_name}: outstanding £${expectedTotal.toFixed(2)}, got £${amountPounds.toFixed(2)}`);

            } else {
                // Payment ≤ outstanding: greedy oldest-first allocation
                let remaining = amountPounds;
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
                    message = `💰 PAYMENT RECEIVED ✅\n\nFrom: ${senderName}\nAmount: £${amountPounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nBookings marked as paid:\n${paidLines}\n\nTotal: £${paidTotal.toFixed(2)} — Received: £${amountPounds.toFixed(2)} ✅`;
                } else {
                    const unpaidLines = unpaidBookings.map(formatBookingLine).join('\n');
                    message = `💰 PARTIAL PAYMENT RECEIVED ✅\n\nFrom: ${senderName}\nAmount: £${amountPounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nBookings marked as paid:\n${paidLines}\n\nStill outstanding (£${remainingBalance.toFixed(2)}):\n${unpaidLines}`;
                }

                if (wasNewAccountName) {
                    message += `\n\n📌 Account name '${senderName}' saved to ${owner.owner_name}'s profile.\nFuture payments will match automatically.`;
                }

                await sendTelegramNotification(message);
                console.log(`[payment-check] Marked paid: owner=${owner.owner_name}, bookings=${bookingsToPay.map(b => b.id).join(',')}`);
            }
        }

        return NextResponse.json({ success: true, processed, matched, unmatched });

    } catch (error) {
        console.error('[payment-check] Error:', error);
        return NextResponse.json(
            { error: 'Payment check failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
