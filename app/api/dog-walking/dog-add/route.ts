import { NextResponse, type NextRequest } from "next/server";
import { sendTelegramNotification } from "@/lib/telegram";
import { getPool } from '@/lib/database';

// --- Database Connection ---
const pool = getPool();

// --- Helper Type (for incoming data) ---
interface AddDogRequest {
    ownerId: number;
    dogName: string;
    dogBreed: string;  // Remove the ? to make it required
    dogAge: number;    // Remove the ? to make it required
}

// --- Main POST Function ---

export async function POST(request: NextRequest) {
    const data: AddDogRequest = await request.json();

    // --- Enhanced Data Validation ---
    if (
        !data.ownerId ||
        !data.dogName ||
        !data.dogBreed ||     // NEW: Required validation
        data.dogAge === undefined || data.dogAge === null // NEW: Required validation
    ) {
        return NextResponse.json(
            { error: "Owner ID, dog name, breed, and age are all required" },
            { status: 400 }
        );
    }

    // Additional validation for data quality
    if (data.dogBreed.trim().length === 0) {
        return NextResponse.json(
            { error: "Dog's breed cannot be empty" },
            { status: 400 }
        );
    }

    if (data.dogAge < 0 || data.dogAge > 30) {
        return NextResponse.json(
            { error: "Dog's age must be between 0 and 30 years" },
            { status: 400 }
        );
    }

    try {
        // --- Insert the new Dog (UPDATED - no null values) ---
        const dogQuery = `
            INSERT INTO hunters_hounds.dogs (owner_id, dog_name, dog_breed, dog_age)
            VALUES ($1, $2, $3, $4)
            RETURNING id, dog_name, dog_breed, dog_age;
        `;

        const dogValues = [
            data.ownerId,
            data.dogName,
            data.dogBreed,  // Remove || null
            data.dogAge,    // Remove || null
        ];

        const dogResult = await pool.query(dogQuery, dogValues);
        const newDog = dogResult.rows[0];

        // --- ADD THIS TELEGRAM NOTIFICATION HERE ---
        // Get owner information for the notification
        const ownerQuery = `
            SELECT owner_name, phone, email 
            FROM hunters_hounds.owners 
            WHERE id = $1;
        `;
        const ownerResult = await pool.query(ownerQuery, [data.ownerId]);
        const owner = ownerResult.rows[0];

        // Send Telegram notification for additional dog
        const telegramMessage = `
        🐕 <b>ADDITIONAL DOG ADDED!</b>
        
        <b>Customer:</b> ${owner.owner_name} (${owner.phone})
        <b>Email:</b> ${owner.email}
        
        <b>New Dog:</b> ${data.dogName}
        <b>Breed:</b> ${data.dogBreed}
        <b>Age:</b> ${data.dogAge} years
        
        <i>Customer added a new dog to their account.</i>
        `;
        await sendTelegramNotification(telegramMessage);

        // --- Success: Return the new dog data (this should already exist)
        return NextResponse.json(
            {
                success: true,
                dog: newDog,
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Failed to add dog:", error);

        // Existing error handling...
        if (error.code === "23503") {
            return NextResponse.json(
                { error: "Invalid owner ID. User not found." },
                { status: 404 }
            );
        }

        // NEW: Don't fail dog addition if only Telegram fails
        if (error.message && error.message.includes('Telegram')) {
            console.warn("Dog addition succeeded but Telegram notification failed:", error);
        }

        return NextResponse.json(
            { error: "Database error while adding dog" },
            { status: 500 }
        );
    }
}