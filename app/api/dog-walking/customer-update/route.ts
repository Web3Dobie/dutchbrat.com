import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

interface UpdateCustomerRequest {
    owner_id: number;
    verification_email?: string; // Original email to verify identity
    verification_phone?: string; // OR original phone to verify identity
    // Fields that can be updated
    owner_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    partner_name?: string;
    partner_email?: string;
    partner_phone?: string;
    vet_info?: string;
    pet_insurance?: string;
}

export async function PUT(request: NextRequest) {
    let requestData: UpdateCustomerRequest;

    try {
        requestData = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    const { owner_id, verification_email, verification_phone } = requestData;

    if (!owner_id || (!verification_email && !verification_phone)) {
        return NextResponse.json(
            { error: "owner_id and either verification_email or verification_phone are required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // First verify the customer exists and email OR phone matches (identity verification)
        let verifyQuery: string;
        let verifyParams: any[];

        if (verification_email) {
            verifyQuery = `
                SELECT id, email FROM hunters_hounds.owners
                WHERE id = $1 AND LOWER(email) = LOWER($2)
            `;
            verifyParams = [owner_id, verification_email.trim()];
        } else {
            // Normalize phone for comparison
            const normalizedPhone = verification_phone!.replace(/[\s\-\(\)]/g, "");
            verifyQuery = `
                SELECT id, phone FROM hunters_hounds.owners
                WHERE id = $1 AND REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $2
            `;
            verifyParams = [owner_id, normalizedPhone];
        }

        const verifyResult = await client.query(verifyQuery, verifyParams);

        if (verifyResult.rows.length === 0) {
            console.log(`[Customer Update] Verification failed for owner_id: ${owner_id}`);
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const allowedFields = [
            'owner_name', 'phone', 'email', 'address',
            'partner_name', 'partner_email', 'partner_phone',
            'vet_info', 'pet_insurance'
        ];

        for (const field of allowedFields) {
            if (requestData[field as keyof UpdateCustomerRequest] !== undefined) {
                const value = requestData[field as keyof UpdateCustomerRequest];
                updates.push(`${field} = $${paramIndex}`);
                // Trim string values, allow empty strings to clear fields
                values.push(typeof value === 'string' ? value.trim() : value);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        // Add updated_at timestamp
        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        // Add owner_id as final parameter
        values.push(owner_id);

        const updateQuery = `
            UPDATE hunters_hounds.owners
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, owner_name, phone, email, address, partner_name, partner_email, partner_phone, vet_info, pet_insurance
        `;

        const updateResult = await client.query(updateQuery, values);

        if (updateResult.rows.length === 0) {
            return NextResponse.json(
                { error: "Failed to update customer" },
                { status: 500 }
            );
        }

        console.log(`[Customer Update] Successfully updated customer ${owner_id}: ${updateResult.rows[0].owner_name}`);

        return NextResponse.json({
            success: true,
            message: "Account details updated successfully",
            customer: updateResult.rows[0]
        });

    } catch (error) {
        console.error("[Customer Update] Database error:", error);
        return NextResponse.json(
            { error: "Database error occurred while updating customer" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
