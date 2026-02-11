import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { format } from "date-fns";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendBookingEmail } from "@/lib/emailService";
import { getSoloWalkPrice } from "@/lib/pricing";
import { getServiceDisplayName } from "@/lib/serviceTypes";
import { getPool } from '@/lib/database';
import { getCalendar, getCalendarId } from '@/lib/googleCalendar';

const pool = getPool();
const calendar = getCalendar();

interface ModifyDogsRequest {
    dog_id_1: number;
    dog_id_2?: number | null;
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const bookingId = parseInt(params.id);
    if (isNaN(bookingId)) {
        return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const data: ModifyDogsRequest = await request.json();

    if (!data.dog_id_1) {
        return NextResponse.json(
            { error: "Booking must have at least one dog" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const bookingQuery = `
            SELECT
                b.id,
                b.owner_id,
                b.service_type,
                b.start_time,
                b.end_time,
                b.duration_minutes,
                b.status,
                b.price_pounds,
                b.google_event_id,
                b.dog_id_1 as current_dog_id_1,
                b.dog_id_2 as current_dog_id_2,
                o.owner_name,
                o.phone,
                o.email,
                o.address
            FROM hunters_hounds.bookings b
            JOIN hunters_hounds.owners o ON b.owner_id = o.id
            WHERE b.id = $1 AND b.status = 'confirmed';
        `;

        const bookingResult = await client.query(bookingQuery, [bookingId]);

        if (bookingResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Booking not found or not confirmed" },
                { status: 404 }
            );
        }

        const booking = bookingResult.rows[0];

        // Validate dogs belong to this owner
        const dogsToValidate = [data.dog_id_1];
        if (data.dog_id_2) dogsToValidate.push(data.dog_id_2);

        const validateResult = await client.query(
            `SELECT id, dog_name FROM hunters_hounds.dogs WHERE id = ANY($1) AND owner_id = $2;`,
            [dogsToValidate, booking.owner_id]
        );

        if (validateResult.rows.length !== dogsToValidate.length) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Selected dog(s) do not belong to this owner" },
                { status: 400 }
            );
        }

        const dogMap = new Map<number, string>();
        validateResult.rows.forEach((row: { id: number; dog_name: string }) => dogMap.set(row.id, row.dog_name));

        // No-op check
        const dog1Changed = data.dog_id_1 !== booking.current_dog_id_1;
        const dog2Changed = (data.dog_id_2 || null) !== booking.current_dog_id_2;
        if (!dog1Changed && !dog2Changed) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "No changes detected" }, { status: 400 });
        }

        // Recalculate price for Solo Walk
        let newPrice = booking.price_pounds;
        const dogCount = data.dog_id_2 ? 2 : 1;
        const isSoloWalk = booking.service_type === 'solo' ||
                           booking.service_type.toLowerCase().includes('solo');

        if (isSoloWalk) {
            const duration = booking.duration_minutes || 60;
            const calculatedPrice = getSoloWalkPrice(duration, dogCount);
            if (calculatedPrice > 0) {
                newPrice = calculatedPrice;
            } else {
                newPrice = duration <= 60
                    ? (dogCount === 2 ? 25.00 : 17.50)
                    : (dogCount === 2 ? 32.50 : 25.00);
            }
        }

        await client.query(
            `UPDATE hunters_hounds.bookings SET dog_id_1 = $2, dog_id_2 = $3, price_pounds = $4 WHERE id = $1;`,
            [bookingId, data.dog_id_1, data.dog_id_2 || null, newPrice]
        );

        const dogNames = data.dog_id_2
            ? `${dogMap.get(data.dog_id_1)} & ${dogMap.get(data.dog_id_2)}`
            : dogMap.get(data.dog_id_1) || "dogs";

        const serviceDisplayName = getServiceDisplayName(booking.service_type);

        // Update Google Calendar
        if (booking.google_event_id) {
            try {
                await calendar.events.patch({
                    calendarId: getCalendarId(),
                    eventId: booking.google_event_id,
                    requestBody: {
                        summary: `${serviceDisplayName} - ${dogNames} (${booking.owner_name})`,
                        description: `Customer: ${booking.owner_name}\nPhone: ${booking.phone}\nAddress: ${booking.address}\nDogs: ${dogNames}\nService: ${serviceDisplayName}\n${newPrice ? `Price: £${parseFloat(newPrice).toFixed(2)}` : ''}\n\n** DOGS MODIFIED (ADMIN) **`.trim(),
                    },
                });
            } catch (calendarError) {
                console.error("Failed to update calendar event:", calendarError);
            }
        }

        // Send confirmation email
        const formattedDate = format(new Date(booking.start_time), "EEEE, MMMM d, yyyy");
        const formattedTime = format(new Date(booking.start_time), "h:mm a");

        try {
            const emailSubject = `Booking Updated - ${serviceDisplayName}`;
            const emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #059669;">Booking Updated</h2>
                    <p>Dear ${booking.owner_name},</p>
                    <p>Your booking has been updated:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Service:</strong> ${serviceDisplayName}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time:</strong> ${formattedTime}</p>
                        <p><strong>Dogs:</strong> ${dogNames}</p>
                        ${newPrice ? `<p><strong>Price:</strong> £${parseFloat(newPrice).toFixed(2)}</p>` : ''}
                    </div>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 14px;"><strong>Hunter's Hounds</strong><br>Phone: 07932749772<br>Email: bookings@hunters-hounds.london</p>
                </div>
            `;
            await sendBookingEmail(booking.id, emailSubject, emailContent);
        } catch (emailError) {
            console.error(`Failed to send update email for booking ${bookingId}:`, emailError);
        }

        // Telegram notification
        try {
            await sendTelegramNotification(`🐕 **BOOKING MODIFIED - Dogs Changed (Admin)**\n\n**Customer:** ${booking.owner_name}\n**Phone:** ${booking.phone}\n**Service:** ${serviceDisplayName}\n**Date:** ${formattedDate} at ${formattedTime}\n**Dogs:** ${dogNames}\n${newPrice ? `**Price:** £${parseFloat(newPrice).toFixed(2)}` : ''}`);
        } catch (telegramError) {
            console.error("Failed to send Telegram notification:", telegramError);
        }

        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: "Booking dogs updated successfully",
            booking_id: bookingId,
            dog_id_1: data.dog_id_1,
            dog_id_2: data.dog_id_2 || null,
            new_price: newPrice,
            dog_names: dogNames,
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Admin modify booking dogs error:", error);
        return NextResponse.json(
            { error: "Failed to modify booking dogs. Please try again." },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
