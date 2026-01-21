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

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");

    // Validation - accept either phone OR email
    if (!phone && !email) {
        return NextResponse.json(
            { error: "Either phone or email parameter is required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        let query: string;
        let params: string[];

        if (email) {
            // Search by email - NOW INCLUDES PARTNER FIELDS
            console.log(`[Customer Lookup] Searching by email: ${email}`);
            query = `
                SELECT 
                    o.id as owner_id,
                    o.owner_name,
                    o.phone,
                    o.email,
                    o.address,
                    o.created_at,
                    o.partner_name,
                    o.partner_email,
                    o.partner_phone,
                    o.payment_preference,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', d.id,
                                'dog_name', d.dog_name,
                                'dog_breed', d.dog_breed,
                                'dog_age', d.dog_age,
                                'image_filename', d.image_filename
                            )
                            ORDER BY d.id
                        ) FILTER (WHERE d.id IS NOT NULL),
                        '[]'::json
                    ) as dogs
                FROM hunters_hounds.owners o
                LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id
                WHERE LOWER(o.email) = LOWER($1) OR LOWER(o.partner_email) = LOWER($1)
                GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at, o.partner_name, o.partner_email, o.partner_phone, o.payment_preference;
            `;
            params = [email.trim()];
        } else {
            // Search by phone - NOW INCLUDES PARTNER FIELDS
            console.log(`[Customer Lookup] Searching by phone: ${phone}`);
            const normalizedPhone = phone!.replace(/[\s\-\(\)]/g, "");
            query = `
                SELECT 
                    o.id as owner_id,
                    o.owner_name,
                    o.phone,
                    o.email,
                    o.address,
                    o.created_at,
                    o.partner_name,
                    o.partner_email,
                    o.partner_phone,
                    o.payment_preference,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', d.id,
                                'dog_name', d.dog_name,
                                'dog_breed', d.dog_breed,
                                'dog_age', d.dog_age,
                                'image_filename', d.image_filename
                            )
                            ORDER BY d.id
                        ) FILTER (WHERE d.id IS NOT NULL),
                        '[]'::json
                    ) as dogs
                FROM hunters_hounds.owners o
                LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id
                WHERE REPLACE(REPLACE(REPLACE(REPLACE(o.phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
                   OR REPLACE(REPLACE(REPLACE(REPLACE(o.partner_phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
                GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at, o.partner_name, o.partner_email, o.partner_phone, o.payment_preference;
            `;
            params = [normalizedPhone];
        }

        const result = await client.query(query, params);

        if (result.rows.length === 0) {
            console.log(`[Customer Lookup] No customer found for ${email ? 'email' : 'phone'}: ${email || phone}`);
            return NextResponse.json({
                found: false,
                message: "No customer found with those details"
            });
        }

        const customer = result.rows[0];

        // Determine if this was a partner login
        let loginType = "primary";
        if (email) {
            if (customer.partner_email && customer.partner_email.toLowerCase() === email.trim().toLowerCase()
                && customer.email.toLowerCase() !== email.trim().toLowerCase()) {
                loginType = "partner_email";
            }
        } else if (phone) {
            const normalizedInput = phone.replace(/[\s\-\(\)]/g, "");
            const normalizedPrimary = customer.phone?.replace(/[\s\-\(\)]/g, "") || "";
            const normalizedPartner = customer.partner_phone?.replace(/[\s\-\(\)]/g, "") || "";
            if (normalizedPartner === normalizedInput && normalizedPrimary !== normalizedInput) {
                loginType = "partner_phone";
            }
        }

        console.log(`[Customer Lookup] Found customer: ${customer.owner_name} with ${customer.dogs.length} dogs (via ${loginType})`);

        // Log image filenames for debugging
        customer.dogs.forEach(dog => {
            console.log(`[Customer Lookup] Dog: ${dog.dog_name}, Image: ${dog.image_filename || 'none'}`);
        });

        return NextResponse.json({
            found: true,
            customer: {
                owner_id: customer.owner_id,
                owner_name: customer.owner_name,
                phone: customer.phone,
                email: customer.email,
                address: customer.address,
                // NEW: Include partner fields
                partner_name: customer.partner_name,
                partner_email: customer.partner_email,
                partner_phone: customer.partner_phone,
                payment_preference: customer.payment_preference,
                dogs: customer.dogs || []
            }
        });

    } catch (error) {
        console.error("[Customer Lookup] Database error:", error);
        return NextResponse.json(
            { error: "Database error occurred while looking up customer" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}