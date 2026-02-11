import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { sendTelegramNotification } from "@/lib/telegram";
import { getPool } from '@/lib/database';
import { getCalendar, getCalendarId } from '@/lib/googleCalendar';
import { getServiceDisplayName } from "@/lib/serviceTypes";

const pool = getPool();
const calendar = getCalendar();

interface ModifyAddressRequest {
    secondary_address_id: number | null; // null = use owner's primary address
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

    const data: ModifyAddressRequest = await request.json();
    // secondary_address_id can be null (primary) or a number — but the key must be present
    if (!('secondary_address_id' in data)) {
        return NextResponse.json(
            { error: "secondary_address_id is required (use null for primary address)" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Fetch booking with owner info
        const bookingQuery = `
            SELECT
                b.id,
                b.owner_id,
                b.service_type,
                b.start_time,
                b.status,
                b.google_event_id,
                b.secondary_address_id as current_secondary_address_id,
                b.dog_id_1,
                b.dog_id_2,
                o.owner_name,
                o.phone,
                o.address as primary_address,
                ARRAY_REMOVE(ARRAY[d1.dog_name, d2.dog_name], NULL) as dog_names
            FROM hunters_hounds.bookings b
            JOIN hunters_hounds.owners o ON b.owner_id = o.id
            LEFT JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
            LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
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

        // No-op check
        const currentId = booking.current_secondary_address_id ?? null;
        const newId = data.secondary_address_id ?? null;
        if (currentId === newId) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "No changes detected" }, { status: 400 });
        }

        // Resolve the new address text for notifications / calendar
        let newAddressText = booking.primary_address;
        let newAddressLabel = "Primary Address";

        if (data.secondary_address_id !== null) {
            const addrResult = await client.query(
                `SELECT address, address_label, is_active, owner_id
                 FROM hunters_hounds.secondary_addresses
                 WHERE id = $1;`,
                [data.secondary_address_id]
            );

            if (addrResult.rows.length === 0) {
                await client.query("ROLLBACK");
                return NextResponse.json(
                    { error: "Secondary address not found" },
                    { status: 404 }
                );
            }

            const addr = addrResult.rows[0];

            if (addr.owner_id !== booking.owner_id) {
                await client.query("ROLLBACK");
                return NextResponse.json(
                    { error: "Address does not belong to this owner" },
                    { status: 400 }
                );
            }

            if (!addr.is_active) {
                await client.query("ROLLBACK");
                return NextResponse.json(
                    { error: "This address is inactive" },
                    { status: 400 }
                );
            }

            newAddressText = addr.address;
            newAddressLabel = addr.address_label;
        }

        // Resolve old address text for notification
        let oldAddressLabel = "Primary Address";
        if (booking.current_secondary_address_id !== null) {
            const oldAddrResult = await client.query(
                `SELECT address_label FROM hunters_hounds.secondary_addresses WHERE id = $1;`,
                [booking.current_secondary_address_id]
            );
            if (oldAddrResult.rows.length > 0) {
                oldAddressLabel = oldAddrResult.rows[0].address_label;
            }
        }

        // Update booking
        await client.query(
            `UPDATE hunters_hounds.bookings SET secondary_address_id = $2 WHERE id = $1;`,
            [bookingId, data.secondary_address_id]
        );

        const serviceDisplayName = getServiceDisplayName(booking.service_type);
        const dogNames = (booking.dog_names || []).join(" & ") || "dogs";

        // Update Google Calendar event description
        if (booking.google_event_id) {
            try {
                await calendar.events.patch({
                    calendarId: getCalendarId(),
                    eventId: booking.google_event_id,
                    requestBody: {
                        description: `Customer: ${booking.owner_name}\nPhone: ${booking.phone}\nAddress: ${newAddressText}\nDogs: ${dogNames}\nService: ${serviceDisplayName}\n\n** ADDRESS MODIFIED (ADMIN) **`.trim(),
                    },
                });
            } catch (calendarError) {
                console.error("Failed to update calendar event:", calendarError);
            }
        }

        // Telegram notification
        try {
            await sendTelegramNotification(
                `📍 **BOOKING ADDRESS CHANGED (Admin)**\n\n**Customer:** ${booking.owner_name}\n**Phone:** ${booking.phone}\n**Booking ID:** ${bookingId}\n\n**From:** ${oldAddressLabel}\n**To:** ${newAddressLabel}\n**New Address:** ${newAddressText}`
            );
        } catch (telegramError) {
            console.error("Failed to send Telegram notification:", telegramError);
        }

        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: "Pickup address updated successfully",
            booking_id: bookingId,
            secondary_address_id: data.secondary_address_id,
            address_label: newAddressLabel,
            address: newAddressText,
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Admin modify booking address error:", error);
        return NextResponse.json(
            { error: "Failed to update pickup address. Please try again." },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
