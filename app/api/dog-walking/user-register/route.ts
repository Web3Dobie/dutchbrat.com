import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendEmail } from "@/lib/emailService";
import { generateWelcomeEmail, type WelcomeEmailData } from "@/lib/emailTemplates";

// --- Database Connection ---
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

// --- Helper Type ---
interface RegisterRequest {
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    dogName: string;
    dogBreed: string;
    dogAge: number;
}

// --- Main POST Function ---
export async function POST(request: NextRequest) {
    const data: RegisterRequest = await request.json();

    // --- Enhanced Data Validation ---
    if (
        !data.ownerName ||
        !data.phone ||
        !data.email ||
        !data.address ||
        !data.dogName ||
        !data.dogBreed ||
        data.dogAge === undefined || data.dogAge === null
    ) {
        return NextResponse.json(
            { error: "All fields including dog's breed and age are required" },
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

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // --- Step 1: Create the Owner ---
        const ownerQuery = `
            INSERT INTO hunters_hounds.owners (owner_name, phone, email, address)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const ownerValues = [data.ownerName, data.phone, data.email, data.address];
        const ownerResult = await client.query(ownerQuery, ownerValues);
        const newOwnerId = ownerResult.rows[0].id;

        // --- Step 2: Create the first Dog ---
        const dogQuery = `
            INSERT INTO hunters_hounds.dogs (owner_id, dog_name, dog_breed, dog_age)
            VALUES ($1, $2, $3, $4)
            RETURNING id, dog_name, dog_breed, dog_age;
        `;
        const dogValues = [
            newOwnerId,
            data.dogName,
            data.dogBreed,
            data.dogAge,
        ];
        const dogResult = await client.query(dogQuery, dogValues);
        const newDog = dogResult.rows[0];

        // --- Step 3: Send Welcome Email ---
        try {
            const welcomeEmailData: WelcomeEmailData = {
                ownerName: data.ownerName,
                dogName: data.dogName,
                dogBreed: data.dogBreed,
                dogAge: data.dogAge,
            };

            await sendEmail({
                to: data.email,
                subject: `Welcome to Hunter's Hounds, ${data.ownerName}! 🐕`,
                html: generateWelcomeEmail(welcomeEmailData),
                // BCC to bookings@hunters-hounds.london automatically added by emailService
                // From address automatically set to "Hunter's Hounds <bookings@hunters-hounds.london>"
            });

            console.log(`Welcome email sent successfully to: ${data.email}`);
        } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            // Don't fail registration if email fails - continue with Telegram notification
        }

        // --- Step 4: Send Telegram notification for new customer registration ---
        try {
            const telegramMessage = `
👋 <b>NEW CUSTOMER REGISTERED!</b>

<b>Customer:</b> ${data.ownerName}
<b>Phone:</b> ${data.phone}
<b>Email:</b> ${data.email}
<b>Address:</b> ${data.address}

<b>First Dog:</b> ${data.dogName}
<b>Breed:</b> ${data.dogBreed}
<b>Age:</b> ${data.dogAge} years

<i>Customer registered and welcome email sent!</i>
            `;
            await sendTelegramNotification(telegramMessage);
        } catch (telegramError) {
            console.error("Failed to send Telegram notification:", telegramError);
            // Don't fail registration if Telegram fails
        }

        await client.query("COMMIT");

        // --- Success Response ---
        return NextResponse.json(
            {
                user: {
                    owner_id: newOwnerId,
                    owner_name: data.ownerName,
                    address: data.address,
                    phone: data.phone,
                    email: data.email,
                    dogs: [newDog],
                },
            },
            { status: 201 }
        );

    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error("Registration failed:", error);

        // Handle database constraints
        if (error.code === "23505") {
            if (error.constraint === "owners_phone_key") {
                return NextResponse.json(
                    { error: "A user with this phone number already exists." },
                    { status: 409 }
                );
            }
            if (error.constraint === "owners_email_key") {
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
        client.release();
    }
}