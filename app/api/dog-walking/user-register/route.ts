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

// --- Helper Type (Updated) ---
interface RegisterRequest {
    ownerName: string;
    phone: string;
    email: string; // <-- NEW
    address: string;
    dogName: string;
    dogBreed?: string;
    dogAge?: number;
}

// --- Main POST Function ---
export async function POST(request: NextRequest) {
    const data: RegisterRequest = await request.json();

    // --- Data Validation (Updated) ---
    if (
        !data.ownerName ||
        !data.phone ||
        !data.email || // <-- NEW
        !data.address ||
        !data.dogName
    ) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN"); // Start transaction

        // --- Step 1: Create the Owner (Query updated) ---
        const ownerQuery = `
      INSERT INTO hunters_hounds.owners (owner_name, phone, email, address)
      VALUES ($1, $2, $3, $4)
      RETURNING id; -- Return the new owner's ID
    `;
        const ownerValues = [data.ownerName, data.phone, data.email, data.address]; // <-- UPDATED
        const ownerResult = await client.query(ownerQuery, ownerValues);
        const newOwnerId = ownerResult.rows[0].id;

        // --- Step 2: Create the first Dog (No change needed) ---
        const dogQuery = `
      INSERT INTO hunters_hounds.dogs (owner_id, dog_name, dog_breed, dog_age)
      VALUES ($1, $2, $3, $4)
      RETURNING id, dog_name, dog_breed, dog_age;
    `;
        const dogValues = [
            newOwnerId,
            data.dogName,
            data.dogBreed || null,
            data.dogAge || null,
        ];
        const dogResult = await client.query(dogQuery, dogValues);
        const newDog = dogResult.rows[0];

        await client.query("COMMIT"); // Commit transaction

        // --- Success: Return data (Response updated) ---
        return NextResponse.json(
            {
                user: {
                    owner_id: newOwnerId,
                    owner_name: data.ownerName,
                    address: data.address,
                    phone: data.phone,
                    email: data.email, // <-- NEW
                    dogs: [newDog],
                },
            },
            { status: 201 }
        );

    } catch (error: any) {
        await client.query("ROLLBACK"); // Rollback on error
        console.error("Registration failed:", error);

        // Check for "unique constraint" errors (Updated)
        if (error.code === "23505") {
            if (error.constraint === "owners_phone_key") {
                return NextResponse.json(
                    { error: "A user with this phone number already exists." },
                    { status: 409 }
                );
            }
            if (error.constraint === "owners_email_key") { // <-- NEW
                return NextResponse.json(
                    { error: "A user with this email address already exists." },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            { error: "Database error during registration" },
            { status: 500 }
        );
    } finally {
        client.release(); // Release the client back to the pool
    }
}