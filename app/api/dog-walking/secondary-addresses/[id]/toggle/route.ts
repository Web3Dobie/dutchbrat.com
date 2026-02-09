import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';

const pool = getPool();

interface ToggleRequest {
    is_active: boolean;
}

interface SecondaryAddress {
    id: number;
    owner_id: number;
    address: string;
    address_label: string;
    contact_name: string;
    contact_email: string | null;
    contact_phone: string;
    partner_name: string | null;
    partner_email: string | null;
    partner_phone: string | null;
    is_active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// PATCH - Toggle active status of secondary address
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const addressId = parseInt(params.id);

    if (isNaN(addressId)) {
        return NextResponse.json(
            { error: "Invalid address ID" },
            { status: 400 }
        );
    }

    let requestData: ToggleRequest;

    try {
        requestData = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    // Validation
    if (typeof requestData.is_active !== 'boolean') {
        return NextResponse.json(
            { error: "is_active must be a boolean value (true or false)" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Check if address exists and get current info
        const existingCheck = await client.query(
            "SELECT id, owner_id, address_label, is_active FROM hunters_hounds.secondary_addresses WHERE id = $1",
            [addressId]
        );

        if (existingCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Address not found" },
                { status: 404 }
            );
        }

        const currentAddress = existingCheck.rows[0];
        const ownerId = currentAddress.owner_id;
        const currentStatus = currentAddress.is_active;

        // Check if status is actually changing
        if (currentStatus === requestData.is_active) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                {
                    success: true,
                    message: `Address is already ${requestData.is_active ? 'active' : 'inactive'}`,
                    address: currentAddress as SecondaryAddress
                }
            );
        }

        // If deactivating, check if there are any confirmed bookings using this address
        if (!requestData.is_active) {
            const futureBookingsCheck = await client.query(
                `SELECT id FROM hunters_hounds.bookings 
                 WHERE secondary_address_id = $1 
                 AND status = 'confirmed' 
                 AND start_time > CURRENT_TIMESTAMP
                 LIMIT 1`,
                [addressId]
            );

            if (futureBookingsCheck.rows.length > 0) {
                await client.query("ROLLBACK");
                return NextResponse.json(
                    { error: "Cannot deactivate address: there are confirmed future bookings using this address. Please cancel or reschedule those bookings first." },
                    { status: 409 }
                );
            }
        }

        // Update the status
        const updateQuery = `
            UPDATE hunters_hounds.secondary_addresses 
            SET 
                is_active = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await client.query(updateQuery, [requestData.is_active, addressId]);
        await client.query("COMMIT");

        const statusText = requestData.is_active ? 'activated' : 'deactivated';

        console.log(`[Secondary Addresses] ${statusText} address ${addressId} "${currentAddress.address_label}" for owner ${ownerId}`);

        return NextResponse.json({
            success: true,
            message: `Address ${statusText} successfully`,
            address: result.rows[0] as SecondaryAddress
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Failed to toggle secondary address status:", error);

        return NextResponse.json(
            {
                error: "Database error occurred while updating address status",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}