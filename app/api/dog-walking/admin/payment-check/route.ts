import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { fetchUnreadRevolutEmails } from '@/lib/emailPoller';
import { parseRevolutEmail } from '@/lib/paymentParser';
import { matchPaymentToOwner, type MatchedBooking } from '@/lib/paymentMatcher';
import { sendTelegramNotification } from '@/lib/telegram';
import { format } from 'date-fns';
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
            const amountExact = Math.abs(amountPounds - expectedTotal) < 0.01;

            if (amountExact && bookings.length > 0) {
                // Mark all matched bookings as completed & paid
                const bookingIds = bookings.map(b => b.id);
                await pool.query(
                    `UPDATE hunters_hounds.bookings SET status = 'completed & paid' WHERE id = ANY($1)`,
                    [bookingIds]
                );

                const bookingLines = bookings
                    .map(b => {
                        const dateLabel = b.end_time && new Date(b.end_time).getTime() !== new Date(b.start_time).getTime()
                            ? `${format(new Date(b.start_time), 'd MMM')}–${format(new Date(b.end_time), 'd MMM')}`
                            : format(new Date(b.start_time), 'd MMM');
                        return `  #${b.id} ${getServiceDisplayName(b.service_type)} ${dateLabel} £${b.price_pounds.toFixed(2)}`;
                    })
                    .join('\n');

                const preferenceLabel = owner.payment_preference === 'per_service'
                    ? 'per-service payer'
                    : `${owner.payment_preference} payer`;

                let message = `💰 PAYMENT RECEIVED ✅\n\nFrom: ${senderName}\nAmount: £${amountPounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nBookings marked as paid:\n${bookingLines}\n\nExpected: £${expectedTotal.toFixed(2)} — Received: £${amountPounds.toFixed(2)} ✅`;

                if (wasNewAccountName) {
                    message += `\n\n📌 Account name '${senderName}' saved to ${owner.owner_name}'s profile.\nFuture payments will match automatically.`;
                }

                await sendTelegramNotification(message);
                console.log(`[payment-check] Matched and marked paid: owner=${owner.owner_name}, bookings=${bookingIds.join(',')}`);

            } else if (bookings.length === 0) {
                // Matched owner but no outstanding completed bookings
                const message = `⚠️ PAYMENT RECEIVED — NO OUTSTANDING BOOKINGS\n\nFrom: ${senderName}\nAmount: £${amountPounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id})\nNo completed unpaid bookings found for this period.\n\nPlease review manually.`;
                await sendTelegramNotification(message);

            } else {
                // Amount mismatch — do NOT auto-mark anything
                const bookingLines = bookings
                    .map(b => {
                        const dateLabel = b.end_time && new Date(b.end_time).getTime() !== new Date(b.start_time).getTime()
                            ? `${format(new Date(b.start_time), 'd MMM')}–${format(new Date(b.end_time), 'd MMM')}`
                            : format(new Date(b.start_time), 'd MMM');
                        return `  #${b.id} ${getServiceDisplayName(b.service_type)} ${dateLabel} £${b.price_pounds.toFixed(2)}`;
                    })
                    .join('\n');

                const preferenceLabel = owner.payment_preference === 'per_service'
                    ? 'per-service payer'
                    : `${owner.payment_preference} payer`;

                const message = `⚠️ PAYMENT MISMATCH — action required\n\nFrom: ${senderName}\nAmount received: £${amountPounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nOutstanding bookings this period:\n${bookingLines}\n\nExpected: £${expectedTotal.toFixed(2)} — Received: £${amountPounds.toFixed(2)}\nBookings NOT marked paid. Please review in admin console.`;

                await sendTelegramNotification(message);
                console.log(`[payment-check] Amount mismatch for owner=${owner.owner_name}: expected £${expectedTotal.toFixed(2)}, got £${amountPounds.toFixed(2)}`);
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
