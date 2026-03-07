import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { matchPaymentToOwner } from '@/lib/paymentMatcher';
import { sendTelegramNotification } from '@/lib/telegram';
import { format } from 'date-fns';
import { getServiceDisplayName } from '@/lib/serviceTypes';

const pool = getPool();

interface PaymentNotifyRequest {
    sender_name: string;
    amount_pounds: number;
    // Optional raw notification fields for debugging unrecognised formats
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

    const { sender_name, amount_pounds, raw_title, raw_text } = data;

    if (!sender_name || typeof amount_pounds !== 'number' || isNaN(amount_pounds)) {
        await sendTelegramNotification(
            `⚠️ PAYMENT NOTIFY — bad request\n\nMissing or invalid sender_name / amount_pounds.\nRaw title: ${raw_title || '(none)'}\nRaw text: ${raw_text || '(none)'}`
        );
        return NextResponse.json({ error: 'sender_name and amount_pounds are required' }, { status: 400 });
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
        const amountExact = Math.abs(amount_pounds - expectedTotal) < 0.01;

        if (amountExact && bookings.length > 0) {
            // Mark all matched bookings as completed & paid
            const bookingIds = bookings.map(b => b.id);
            await pool.query(
                `UPDATE hunters_hounds.bookings SET status = 'completed & paid' WHERE id = ANY($1)`,
                [bookingIds]
            );

            const bookingLines = bookings
                .map(b => `  #${b.id} ${getServiceDisplayName(b.service_type)} ${format(new Date(b.start_time), 'd MMM')} £${b.price_pounds.toFixed(2)}`)
                .join('\n');

            const preferenceLabel = owner.payment_preference === 'per_service'
                ? 'per-service payer'
                : `${owner.payment_preference} payer`;

            let message = `💰 PAYMENT RECEIVED ✅\n\nFrom: ${sender_name}\nAmount: £${amount_pounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nBookings marked as paid:\n${bookingLines}\n\nExpected: £${expectedTotal.toFixed(2)} — Received: £${amount_pounds.toFixed(2)} ✅`;

            if (wasNewAccountName) {
                message += `\n\n📌 Account name '${sender_name}' saved to ${owner.owner_name}'s profile.\nFuture payments will match automatically.`;
            }

            await sendTelegramNotification(message);
            return NextResponse.json({ success: true, matched: true, marked_paid: bookingIds });

        } else if (bookings.length === 0) {
            await sendTelegramNotification(
                `⚠️ PAYMENT RECEIVED — NO OUTSTANDING BOOKINGS\n\nFrom: ${sender_name}\nAmount: £${amount_pounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id})\nNo completed unpaid bookings found for this period.\n\nPlease review manually.`
            );
            return NextResponse.json({ success: true, matched: true, marked_paid: [] });

        } else {
            // Amount mismatch — do NOT auto-mark anything
            const bookingLines = bookings
                .map(b => `  #${b.id} ${getServiceDisplayName(b.service_type)} ${format(new Date(b.start_time), 'd MMM')} £${b.price_pounds.toFixed(2)}`)
                .join('\n');

            const preferenceLabel = owner.payment_preference === 'per_service'
                ? 'per-service payer'
                : `${owner.payment_preference} payer`;

            await sendTelegramNotification(
                `⚠️ PAYMENT MISMATCH — action required\n\nFrom: ${sender_name}\nAmount received: £${amount_pounds.toFixed(2)}\n\nMatched to: ${owner.owner_name} (#${owner.id}) — ${preferenceLabel}\nOutstanding bookings this period:\n${bookingLines}\n\nExpected: £${expectedTotal.toFixed(2)} — Received: £${amount_pounds.toFixed(2)}\nBookings NOT marked paid. Please review in admin console.`
            );
            return NextResponse.json({ success: true, matched: true, marked_paid: [] });
        }

    } catch (error) {
        console.error('[payment-notify] Error:', error);
        return NextResponse.json(
            { error: 'Payment processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
