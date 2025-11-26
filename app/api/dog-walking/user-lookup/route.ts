import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";

// --- Database Connection ---
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");

    // Accept either phone or email
    if (!phone && !email) {
        return NextResponse.json(
            { error: "Either phone or email parameter is required" },
            { status: 400 }
        );
    }

    try {
        let ownerQuery: string;
        let params: string[];

        if (email) {
            // Search by email
            console.log(`[User Lookup] Searching by email: ${email}`);
            ownerQuery = `
                SELECT id, owner_name, address, phone, email 
                FROM hunters_hounds.owners 
                WHERE LOWER(email) = LOWER($1)
            `;
            params = [email.trim()];
        } else {
            // Search by phone (original logic)
            console.log(`[User Lookup] Searching by phone: ${phone}`);
            ownerQuery = `
                SELECT id, owner_name, address, phone, email 
                FROM hunters_hounds.owners 
                WHERE phone = $1
            `;
            params = [phone!];
        }

        const ownerResult = await pool.query(ownerQuery, params);

        if (ownerResult.rows.length === 0) {
            console.log(`[User Lookup] No user found for ${email ? 'email' : 'phone'}: ${email || phone}`);
            return NextResponse.json({ found: false, user: null });
        }

        const owner = ownerResult.rows[0];

        // --- Step 2: Find Their Dogs - INCLUDES image_filename ---
        console.log(`[User Lookup] Found owner: ${owner.owner_name} (ID: ${owner.id})`);
        const dogsQuery = `
            SELECT id, dog_name, dog_breed, dog_age, image_filename 
            FROM hunters_hounds.dogs 
            WHERE owner_id = $1
            ORDER BY id
        `;
        const dogsResult = await pool.query(dogsQuery, [owner.id]);
        const dogs = dogsResult.rows;

        // Log image filenames for debugging
        dogs.forEach(dog => {
            console.log(`[User Lookup] Dog: ${dog.dog_name}, Image: ${dog.image_filename || 'none'}`);
        });

        // --- Success: Return data ---
        return NextResponse.json({
            found: true,
            user: {
                owner_id: owner.id,
                owner_name: owner.owner_name,
                address: owner.address,
                phone: owner.phone,
                email: owner.email,
                dogs: dogs,
            },
        });

    } catch (error) {
        console.error("[User Lookup] Database error:", error);
        return NextResponse.json(
            { error: "Database error during user lookup" },
            { status: 500 }
        );
    }
}