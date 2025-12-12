import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

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

interface CreateAddressRequest {
    owner_id: number;
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

// GET - List secondary addresses for a customer
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const owner_id = searchParams.get("owner_id");

    if (!owner_id || isNaN(parseInt(owner_id))) {
        return NextResponse.json(
            { error: "Valid owner_id parameter is required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        const query = `
            SELECT 
                id,
                owner_id,
                address,
                address_label,
                contact_name,
                contact_email,
                contact_phone,
                partner_name,
                partner_email,
                partner_phone,
                is_active,
                notes,
                created_at,
                updated_at
            FROM hunters_hounds.secondary_addresses 
            WHERE owner_id = $1 
            ORDER BY created_at DESC
        `;

        const result = await client.query(query, [parseInt(owner_id)]);

        console.log(`[Secondary Addresses] Found ${result.rows.length} addresses for owner ${owner_id}`);

        return NextResponse.json({
            success: true,
            addresses: result.rows as SecondaryAddress[]
        });

    } catch (error) {
        console.error("Failed to fetch secondary addresses:", error);
        return NextResponse.json(
            {
                error: "Database error occurred while fetching addresses",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// POST - Create new secondary address
export async function POST(request: NextRequest) {
    let requestData: CreateAddressRequest;

    try {
        requestData = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    // Validation
    if (!requestData.owner_id || !requestData.address || !requestData.address_label ||
        !requestData.contact_name || !requestData.contact_phone) {
        return NextResponse.json(
            { error: "Missing required fields: owner_id, address, address_label, contact_name, contact_phone" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Check if owner exists
        const ownerCheck = await client.query(
            "SELECT id FROM hunters_hounds.owners WHERE id = $1",
            [requestData.owner_id]
        );

        if (ownerCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "Owner not found" },
                { status: 404 }
            );
        }

        // Check if address label is unique for this owner
        const labelCheck = await client.query(
            `SELECT id FROM hunters_hounds.secondary_addresses 
             WHERE owner_id = $1 AND LOWER(address_label) = LOWER($2)`,
            [requestData.owner_id, requestData.address_label.trim()]
        );

        if (labelCheck.rows.length > 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { error: "An address with this label already exists. Please choose a different label." },
                { status: 409 }
            );
        }

        // Insert new address
        const insertQuery = `
            INSERT INTO hunters_hounds.secondary_addresses (
                owner_id, address, address_label, contact_name, contact_email, contact_phone,
                partner_name, partner_email, partner_phone, notes, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const insertValues = [
            requestData.owner_id,
            requestData.address.trim(),
            requestData.address_label.trim(),
            requestData.contact_name.trim(),
            requestData.contact_email?.trim() || null,
            requestData.contact_phone.trim(),
            requestData.partner_name?.trim() || null,
            requestData.partner_email?.trim() || null,
            requestData.partner_phone?.trim() || null,
            requestData.notes?.trim() || null,
            true // Default to active
        ];

        const result = await client.query(insertQuery, insertValues);
        await client.query("COMMIT");

        console.log(`[Secondary Addresses] Created address "${requestData.address_label}" for owner ${requestData.owner_id}`);

        return NextResponse.json({
            success: true,
            message: "Secondary address created successfully",
            address: result.rows[0] as SecondaryAddress
        }, { status: 201 });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Failed to create secondary address:", error);

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
                error: "Database error occurred while creating address",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}