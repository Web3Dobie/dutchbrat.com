import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendEmail } from "@/lib/emailService";
import { generateNoShowEmail } from "@/lib/emailTemplates";
import { format } from "date-fns";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getServiceDisplayName } from "@/lib/serviceTypes";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

interface UpdateStatusRequest {
    status: string;
}

const VALID_STATUSES = ['confirmed', 'completed', 'cancelled', 'no_show'];

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        const bookingId = parseInt(params.id);
        if (isNaN(bookingId)) {
            return NextResponse.json(
                { error: "Invalid booking ID" },
                { status: 400 }
            );
        }

        const data: UpdateStatusRequest = await request.json();

        // Validate status
        if (!VALID_STATUSES.includes(data.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // First, get booking details for email and notifications
            const checkQuery = `
                SELECT 
                    b.id,
                    b.status as current_status,
                    b.service_type,
                    b.price_pounds,
                    b.start_time,
                    b.end_time,
                    b.duration_minutes,
                    o.owner_name,
                    o.email,
                    o.phone,
                    array_agg(
                        CASE 
                            WHEN d1.id IS NOT NULL THEN d1.dog_name
                            WHEN d2.id IS NOT NULL THEN d2.dog_name
                            ELSE NULL
                        END
                    ) FILTER (WHERE d1.id IS NOT NULL OR d2.id IS NOT NULL) as dog_names
                FROM hunters_hounds.bookings b
                JOIN hunters_hounds.owners o ON b.owner_id = o.id
                LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
                LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
                WHERE b.id = $1
                GROUP BY b.id, b.status, b.service_type, b.price_pounds, b.start_time, 
                         b.end_time, b.duration_minutes, o.owner_name, o.email, o.phone;
            `;

            const checkResult = await client.query(checkQuery, [bookingId]);

            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Booking not found" },
                    { status: 404 }
                );
            }

            const booking = checkResult.rows[0];

            // Prevent editing completed & paid bookings
            if (booking.current_status === 'completed & paid') {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Cannot edit status for completed & paid bookings" },
                    { status: 400 }
                );
            }

            // Prevent changing to the same status
            if (booking.current_status === data.status) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: `Booking is already ${data.status}` },
                    { status: 400 }
                );
            }

            // Update the status
            const updateQuery = `
                UPDATE hunters_hounds.bookings 
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND status != 'completed & paid'
                RETURNING id, status;
            `;

            const updateResult = await client.query(updateQuery, [data.status, bookingId]);

            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "Failed to update status. Booking may be completed & paid." },
                    { status: 400 }
                );
            }

            await client.query('COMMIT');

            const dogNames = booking.dog_names.join(', ');
            const appointmentDateForTelegram = format(new Date(booking.start_time), "EEEE, dd MMMM 'at' HH:mm");

            // Send no-show email if status is 'no_show'
            if (data.status === 'no_show') {
                try {
                    const emailSubject = `Missed Appointment - Hunter's Hounds`;
                    const appointmentDate = format(new Date(booking.start_time), "EEEE, dd MMMM yyyy");
                    const appointmentTime = format(new Date(booking.start_time), "HH:mm");

                    const emailContent = generateNoShowEmail({
                        ownerName: booking.owner_name,
                        serviceType: booking.service_type,
                        appointmentDate: appointmentDate,
                        appointmentTime: appointmentTime,
                        dogNames: dogNames,
                    });

                    await sendEmail({
                        to: booking.email,
                        subject: emailSubject,
                        html: emailContent,
                    });

                    console.log(`No-show email sent to ${booking.email} for booking #${bookingId}`);
                } catch (emailError) {
                    console.error("Failed to send no-show email:", emailError);
                    // Don't fail the operation if email fails
                }
            }

            // Send Telegram notification
            try {
                const statusEmoji = {
                    'confirmed': '✅',
                    'completed': '🎉',
                    'cancelled': '❌',
                    'no_show': '👻'
                }[data.status] || '📋';

                let telegramMessage = `
${statusEmoji} <b>STATUS UPDATED</b> ${statusEmoji}

<b>Booking:</b> #${bookingId}
<b>Customer:</b> ${booking.owner_name}
<b>Service:</b> ${getServiceDisplayName(booking.service_type)} (${dogNames})
<b>Date:</b> ${appointmentDateForTelegram}

<b>Status Change:</b>
${booking.current_status} → ${data.status}

<i>Updated via Admin Dashboard</i>
                `.trim();

                if (data.status === 'no_show') {
                    telegramMessage += `\n\n💌 <b>No-show email sent to customer</b>`;
                }

                await sendTelegramNotification(telegramMessage);
            } catch (telegramError) {
                console.error("Failed to send Telegram notification:", telegramError);
                // Don't fail the operation if Telegram fails
            }

            return NextResponse.json({
                success: true,
                booking_id: bookingId,
                old_status: booking.current_status,
                new_status: data.status,
                email_sent: data.status === 'no_show',
                message: `Status updated successfully${data.status === 'no_show' ? ' and no-show email sent' : ''}`
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Update status error:", error);
        return NextResponse.json(
            { error: "Failed to update status. Please try again." },
            { status: 500 }
        );
    }
}