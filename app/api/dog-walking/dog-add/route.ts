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

// --- Helper Type (for incoming data) ---
interface AddDogRequest {
    ownerId: number;
    dogName: string;
    dogBreed?: string;
    dogAge?: number;
}

// --- Main POST Function ---

export async function POST(request: NextRequest) {
    const data: AddDogRequest = await request.json();

    // --- Data Validation ---
    if (!data.ownerId || !data.dogName) {
        return NextResponse.json(
            { error: "Owner ID and Dog Name are required" },
            { status: 400 }
        );
    }

    try {
        // --- Insert the new Dog ---
        const dogQuery = `
      INSERT INTO hunters_hounds.dogs (owner_id, dog_name, dog_breed, dog_age)
      VALUES ($1, $2, $3, $4)
      RETURNING id, dog_name, dog_breed, dog_age; -- Return the new dog's details
    `;

        const dogValues = [
            data.ownerId,
            data.dogName,
            data.dogBreed || null,
            data.dogAge || null,
        ];

        const dogResult = await pool.query(dogQuery, dogValues);
        const newDog = dogResult.rows[0];

        // --- Success: Return the new dog data ---
        return NextResponse.json(
            {
                success: true,
                dog: newDog,
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Failed to add dog:", error);

        // This error would happen if the owner_id doesn't exist
        if (error.code === "23503") { // Foreign key violation
            return NextResponse.json(
                { error: "Invalid owner ID. User not found." },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: "Database error while adding dog" },
            { status: 500 }
        );
    }
}