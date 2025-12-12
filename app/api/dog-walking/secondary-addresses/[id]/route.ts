import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

interface UpdateAddressRequest {
    address: string;
    address_label: string;
    contact_name: string;
    contact_email?: string;
    contact_phone: string;
    partner_name?: string;
    partner_email?: string;
    partner_phone?: string;
    notes?: string;
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

// PUT - Update existing secondary address
export async function PUT(
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

    let requestData: UpdateAddressRequest;

    try {
        requestData = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    // Validation
    if (!requestData.address || !requestData.address_label ||
        !requestData.contact_name || !requestData.contact_phone) {
        return NextResponse.json(
            { error: "Missing required fields: address, address_label, contact_name, contact_phone" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Check if address exists and get owner_id
        const existingCheck = await client.query(
            "SELECT id, owner_id, address_label FROM hunters_hounds.secondary_addresses WHERE id = $1",
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

        // Check if new label conflicts with other addresses for this owner (exclude current address)
        const labelCheck = await client.query(
            `SELECT id FROM hunters_hounds.secondary_addresses 
             WHERE owner_id = $1 AND LOWER(address_label) = LOWER($2) AND id != $3`,
            [ownerId, requestData.address_label.trim(), addressId]
        );

        if (labelCheck.rows.length > 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "An address with this label already exists. Please choose a different label." },
                { status: 409 }
            );
        }

        // Update address
        const updateQuery = `
            UPDATE hunters_hounds.secondary_addresses 
            SET 
                address = $1,
                address_label = $2,
                contact_name = $3,
                contact_email = $4,
                contact_phone = $5,
                partner_name = $6,
                partner_email = $7,
                partner_phone = $8,
                notes = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;

        const updateValues = [
            requestData.address.trim(),
            requestData.address_label.trim(),
            requestData.contact_name.trim(),
            requestData.contact_email?.trim() || null,
            requestData.contact_phone.trim(),
            requestData.partner_name?.trim() || null,
            requestData.partner_email?.trim() || null,
            requestData.partner_phone?.trim() || null,
            requestData.notes?.trim() || null,
            addressId
        ];

        const result = await client.query(updateQuery, updateValues);
        await client.query("COMMIT");

        console.log(`[Secondary Addresses] Updated address ${addressId} "${requestData.address_label}" for owner ${ownerId}`);

        return NextResponse.json({
            success: true,
            message: "Address updated successfully",
            address: result.rows[0] as SecondaryAddress
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Failed to update secondary address:", error);

        // Handle database constraints
        if (error && typeof error === 'object' && 'code' in error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "An address with this label already exists for this customer" },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            {
                error: "Database error occurred while updating address",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// DELETE - Remove secondary address
export async function DELETE(
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

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Check if address exists and get info for logging
        const existingCheck = await client.query(
            "SELECT id, owner_id, address_label FROM hunters_hounds.secondary_addresses WHERE id = $1",
            [addressId]
        );

        if (existingCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Address not found" },
                { status: 404 }
            );
        }

        const addressInfo = existingCheck.rows[0];

        // Check if this address is being used in any bookings
        const bookingCheck = await client.query(
            "SELECT id FROM hunters_hounds.bookings WHERE secondary_address_id = $1 LIMIT 1",
            [addressId]
        );

        if (bookingCheck.rows.length > 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Cannot delete address: it is being used by existing bookings. Please deactivate it instead." },
                { status: 409 }
            );
        }

        // Delete the address
        const deleteResult = await client.query(
            "DELETE FROM hunters_hounds.secondary_addresses WHERE id = $1",
            [addressId]
        );

        if (deleteResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Address not found or already deleted" },
                { status: 404 }
            );
        }

        await client.query("COMMIT");

        console.log(`[Secondary Addresses] Deleted address ${addressId} "${addressInfo.address_label}" for owner ${addressInfo.owner_id}`);

        return NextResponse.json({
            success: true,
            message: "Address deleted successfully"
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Failed to delete secondary address:", error);

        return NextResponse.json(
            {
                error: "Database error occurred while deleting address",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}