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

    if (!phone) {
        return NextResponse.json(
            { error: "Phone number is required" },
            { status: 400 }
        );
    }

    try {
        // --- Step 1: Find the Owner (Query updated to include email) ---
        const ownerQuery = `
      SELECT id, owner_name, address, phone, email 
      FROM hunters_hounds.owners 
      WHERE phone = $1
    `;
        const ownerResult = await pool.query(ownerQuery, [phone]);

        if (ownerResult.rows.length === 0) {
            return NextResponse.json({ found: false, user: null });
        }

        const owner = ownerResult.rows[0];

        // --- Step 2: Find Their Dogs (No change needed) ---
        const dogsQuery = `
      SELECT id, dog_name, dog_breed, dog_age 
      FROM hunters_hounds.dogs 
      WHERE owner_id = $1
    `;
        const dogsResult = await pool.query(dogsQuery, [owner.id]);
        const dogs = dogsResult.rows;

        // --- Success: Return data (Response updated to include email) ---
        return NextResponse.json({
            found: true,
            user: {
                owner_id: owner.id,
                owner_name: owner.owner_name,
                address: owner.address,
                phone: owner.phone,
                email: owner.email, // <-- NEW
                dogs: dogs,
            },
        });

    } catch (error) {
        console.error("User lookup failed:", error);
        return NextResponse.json(
            { error: "Database error during user lookup" },
            { status: 500 }
        );
    }
}