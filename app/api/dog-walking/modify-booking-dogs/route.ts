import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { google } from "googleapis";
import { format } from "date-fns";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendBookingEmail } from "@/lib/emailService";
import { getSoloWalkPrice } from "@/lib/pricing";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

// Google Calendar
const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar"],
});
const calendar = google.calendar({ version: "v3", auth });

interface ModifyDogsRequest {
    booking_id: number;
    dog_id_1: number;        // Required - must have at least 1 dog
    dog_id_2?: number | null; // Optional - null to remove second dog
}

export async function POST(request: NextRequest) {
    const data: ModifyDogsRequest = await request.json();

    // Validation
    if (!data.booking_id) {
        return NextResponse.json(
            { error: "booking_id is required" },
            { status: 400 }
        );
    }

    if (!data.dog_id_1) {
        return NextResponse.json(
            { error: "Booking must have at least one dog" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Fetch the current booking details with owner info
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

        const bookingResult = await client.query(bookingQuery, [data.booking_id]);

        if (bookingResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Booking not found or not available for modification" },
                { status: 404 }
            );
        }

        const booking = bookingResult.rows[0];

        // Check if booking is in the future
        const startTime = new Date(booking.start_time);
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        if (startTime < twoHoursFromNow) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Cannot modify dogs for bookings starting within 2 hours" },
                { status: 400 }
            );
        }

        // Validate that the dogs belong to this owner
        const dogsToValidate = [data.dog_id_1];
        if (data.dog_id_2) {
            dogsToValidate.push(data.dog_id_2);
        }

        const validateDogsQuery = `
            SELECT id, dog_name FROM hunters_hounds.dogs
            WHERE id = ANY($1) AND owner_id = $2;
        `;
        const validateResult = await client.query(validateDogsQuery, [dogsToValidate, booking.owner_id]);

        if (validateResult.rows.length !== dogsToValidate.length) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Selected dog(s) do not belong to your account" },
                { status: 400 }
            );
        }

        // Create a map of dog IDs to names for later use
        const dogMap = new Map<number, string>();
        validateResult.rows.forEach(row => dogMap.set(row.id, row.dog_name));

        // Calculate new price for Solo Walk service
        let newPrice = booking.price_pounds;
        if (booking.service_type === 'solo') {
            const dogCount = data.dog_id_2 ? 2 : 1;
            newPrice = getSoloWalkPrice(booking.duration_minutes, dogCount);
        }

        // Check if anything actually changed
        const dog1Changed = data.dog_id_1 !== booking.current_dog_id_1;
        const dog2Changed = (data.dog_id_2 || null) !== booking.current_dog_id_2;

        if (!dog1Changed && !dog2Changed) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "No changes detected" },
                { status: 400 }
            );
        }

        // Update booking in database
        const updateQuery = `
            UPDATE hunters_hounds.bookings
            SET
                dog_id_1 = $2,
                dog_id_2 = $3,
                price_pounds = $4
            WHERE id = $1;
        `;

        await client.query(updateQuery, [
            data.booking_id,
            data.dog_id_1,
            data.dog_id_2 || null,
            newPrice
        ]);

        // Build dog names string
        const dogNames = data.dog_id_2
            ? `${dogMap.get(data.dog_id_1)} & ${dogMap.get(data.dog_id_2)}`
            : dogMap.get(data.dog_id_1) || "dogs";

        // Update Google Calendar event
        const serviceDisplayName = getServiceDisplayName(booking.service_type);

        if (booking.google_event_id) {
            try {
                await calendar.events.patch({
                    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
                    eventId: booking.google_event_id,
                    requestBody: {
                        summary: `${serviceDisplayName} - ${dogNames} (${booking.owner_name})`,
                        description: `
Customer: ${booking.owner_name}
Phone: ${booking.phone}
Address: ${booking.address}
Dogs: ${dogNames}
Service: ${serviceDisplayName}
${newPrice ? `Price: £${parseFloat(newPrice).toFixed(2)}` : ''}

** DOGS MODIFIED **
                        `.trim(),
                    },
                });
                console.log("Google Calendar event updated:", booking.google_event_id);
            } catch (calendarError) {
                console.error("Failed to update calendar event:", calendarError);
                // Don't fail the whole operation if calendar update fails
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

                    <p>Your booking has been successfully updated:</p>

                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #374151;">Updated Booking Details</h3>
                        <p><strong>Service:</strong> ${serviceDisplayName}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time:</strong> ${formattedTime}</p>
                        <p><strong>Dogs:</strong> ${dogNames}</p>
                        ${newPrice ? `<p><strong>Price:</strong> £${parseFloat(newPrice).toFixed(2)}</p>` : ''}
                    </div>

                    <p>If you need to make any further changes, please contact us or use your dashboard.</p>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

                    <p style="color: #6b7280; font-size: 14px;">
                        <strong>Hunter's Hounds</strong><br>
                        Professional Dog Walking Service<br>
                        Phone: 07932749772<br>
                        Email: bookings@hunters-hounds.london
                    </p>
                </div>
            `;

            await sendBookingEmail(booking.id, emailSubject, emailContent);
            console.log(`Booking update confirmation email sent for booking ${booking.id}`);
        } catch (emailError) {
            console.error(`Failed to send update email for booking ${booking.id}:`, emailError);
            // Don't fail the operation if email fails
        }

        // Send Telegram notification
        try {
            const telegramMessage = `
🐕 **BOOKING MODIFIED - Dogs Changed**

**Customer:** ${booking.owner_name}
**Phone:** ${booking.phone}
**Service:** ${serviceDisplayName}

**Date:** ${formattedDate}
**Time:** ${formattedTime}

**Dogs:** ${dogNames}
${newPrice ? `**Price:** £${parseFloat(newPrice).toFixed(2)}` : ''}

**Address:** ${booking.address}
            `.trim();

            await sendTelegramNotification(telegramMessage);
        } catch (telegramError) {
            console.error("Failed to send Telegram notification:", telegramError);
            // Don't fail the operation if Telegram fails
        }

        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: "Booking dogs updated successfully",
            booking_id: data.booking_id,
            dog_id_1: data.dog_id_1,
            dog_id_2: data.dog_id_2 || null,
            new_price: newPrice
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Modify booking dogs error:", error);
        return NextResponse.json(
            { error: "Failed to modify booking. Please try again." },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// Helper function to get service display name
function getServiceDisplayName(serviceType: string): string {
    const serviceMap: Record<string, string> = {
        'meetgreet': 'Meet & Greet',
        'solo': 'Solo Walk (60 min)',
        'quick': 'Quick Walk (30 min)',
        'sitting': 'Dog Sitting',
    };
    return serviceMap[serviceType] || serviceType;
}
