import { NextResponse, type NextRequest } from "next/server";
import { sendTelegramNotification } from "@/lib/telegram";
import { getPool } from '@/lib/database';
import { formatDogAge, formatDogBirthday } from '@/lib/dogAge';
import { requireOwner } from '@/lib/customerAuth';

// --- Database Connection ---
const pool = getPool();

// --- Helper Type (for incoming data) ---
interface AddDogRequest {
    ownerId: number;
    dogName: string;
    dogBreed: string;
    dogBirthday?: string; // YYYY-MM-01 format (month/year)
    dogAge?: number;      // Legacy fallback
}

// --- Main POST Function ---

export async function POST(request: NextRequest) {
    // Was completely unauthenticated with ownerId taken from the body, so anyone
    // could attach a dog to any client's account. dog_name is also interpolated
    // into outgoing emails, which made this the injection point for the stored
    // XSS in lib/emailTemplates.ts.
    const auth = requireOwner(request);
    if ('response' in auth) return auth.response;

    const data: AddDogRequest = await request.json();

    // The session decides the owner; any ownerId in the body is ignored.
    data.ownerId = auth.ownerId;

    // --- Enhanced Data Validation ---
    if (!data.dogName || !data.dogBreed) {
        return NextResponse.json(
            { error: "Dog name and breed are both required" },
            { status: 400 }
        );
    }

    if (data.dogBreed.trim().length === 0) {
        return NextResponse.json(
            { error: "Dog's breed cannot be empty" },
            { status: 400 }
        );
    }

    if (!data.dogBirthday && (data.dogAge === undefined || data.dogAge === null)) {
        return NextResponse.json(
            { error: "Dog's birthday or age is required" },
            { status: 400 }
        );
    }

    try {
        // --- Insert the new Dog (UPDATED - no null values) ---
        const dogQuery = `
            INSERT INTO hunters_hounds.dogs (owner_id, dog_name, dog_breed, dog_age, dog_birthday)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, dog_name, dog_breed, dog_age, dog_birthday;
        `;

        const dogValues = [
            data.ownerId,
            data.dogName,
            data.dogBreed,
            data.dogBirthday ? null : (data.dogAge ?? null),
            data.dogBirthday ?? null,
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
        <b>Birthday:</b> ${data.dogBirthday ? `${formatDogBirthday(data.dogBirthday)} (${formatDogAge(data.dogBirthday)} old)` : `${data.dogAge} years (no birthday recorded)`}
        
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