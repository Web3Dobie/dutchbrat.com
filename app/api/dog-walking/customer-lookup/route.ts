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

    // Validation
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
            // Search by email
            query = `
                SELECT 
                    o.id as owner_id,
                    o.owner_name,
                    o.phone,
                    o.email,
                    o.address,
                    o.created_at,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', d.id,
                                'dog_name', d.dog_name,
                                'dog_breed', d.dog_breed,
                                'dog_age', d.dog_age
                            )
                        ) FILTER (WHERE d.id IS NOT NULL),
                        '[]'::json
                    ) as dogs
                FROM hunters_hounds.owners o
                LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id
                WHERE LOWER(o.email) = LOWER($1)
                GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at;
            `;
            params = [email.trim()];
        } else {
            // Search by phone (normalize phone number)
            const normalizedPhone = phone!.replace(/[\s\-\(\)]/g, "");
            query = `
                SELECT 
                    o.id as owner_id,
                    o.owner_name,
                    o.phone,
                    o.email,
                    o.address,
                    o.created_at,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', d.id,
                                'dog_name', d.dog_name,
                                'dog_breed', d.dog_breed,
                                'dog_age', d.dog_age
                            )
                        ) FILTER (WHERE d.id IS NOT NULL),
                        '[]'::json
                    ) as dogs
                FROM hunters_hounds.owners o
                LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id
                WHERE REPLACE(REPLACE(REPLACE(REPLACE(o.phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
                GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at;
            `;
            params = [normalizedPhone];
        }

        const result = await client.query(query, params);

        if (result.rows.length === 0) {
            return NextResponse.json({
                found: false,
                message: "No customer found with those details"
            });
        }

        const customer = result.rows[0];

        return NextResponse.json({
            found: true,
            customer: {
                owner_id: customer.owner_id,
                owner_name: customer.owner_name,
                phone: customer.phone,
                email: customer.email,
                address: customer.address,
                dogs: customer.dogs || []
            }
        });

    } catch (error) {
        console.error("Customer lookup error:", error);
        return NextResponse.json(
            { error: "Database error occurred while looking up customer" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}