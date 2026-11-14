import { NextResponse, type NextRequest } from "next/server";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendEmail } from "@/lib/emailService";
import { generateWelcomeEmail, type WelcomeEmailData } from "@/lib/emailTemplates";
import { getPool } from '@/lib/database';
import { formatDogAge, formatDogBirthday } from '@/lib/dogAge';
import { CUSTOMER_COOKIE, SESSION_COOKIE_OPTIONS, SESSION_TTL_SECONDS, signSession } from '@/lib/session';

// --- Database Connection ---
const pool = getPool();

// --- Helper Type ---
interface RegisterRequest {
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    dogName: string;
    dogBreed: string;
    dogBirthday?: string; // YYYY-MM-01 format (month/year)
    dogAge?: number;      // Legacy fallback
    photoSharingConsent?: boolean;
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
        !data.dogBreed
    ) {
        return NextResponse.json(
            { error: "All fields including dog's breed are required" },
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

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // --- Step 1: Create the Owner ---
        const ownerQuery = `
            INSERT INTO hunters_hounds.owners (owner_name, phone, email, address, photo_sharing_consent)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const ownerValues = [data.ownerName, data.phone, data.email, data.address, data.photoSharingConsent || false];
        const ownerResult = await client.query(ownerQuery, ownerValues);
        const newOwnerId = ownerResult.rows[0].id;

        // --- Step 2: Create the first Dog ---
        const dogQuery = `
            INSERT INTO hunters_hounds.dogs (owner_id, dog_name, dog_breed, dog_age, dog_birthday)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, dog_name, dog_breed, dog_age, dog_birthday;
        `;
        const dogValues = [
            newOwnerId,
            data.dogName,
            data.dogBreed,
            data.dogBirthday ? null : (data.dogAge ?? null),
            data.dogBirthday ?? null,
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
                dogBirthday: data.dogBirthday,
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
<b>Photo Sharing:</b> ${data.photoSharingConsent ? '✅ Allowed' : '❌ Not allowed'}

<b>First Dog:</b> ${data.dogName}
<b>Breed:</b> ${data.dogBreed}
<b>Birthday:</b> ${data.dogBirthday ? `${formatDogBirthday(data.dogBirthday)} (${formatDogAge(data.dogBirthday)} old)` : `${data.dogAge} years (no birthday recorded)`}

<i>Customer registered and welcome email sent!</i>
            `;
            await sendTelegramNotification(telegramMessage);
        } catch (telegramError) {
            console.error("Failed to send Telegram notification:", telegramError);
            // Don't fail registration if Telegram fails
        }

        await client.query("COMMIT");

        // --- Success Response ---
        // The session is established here rather than relying on the client to
        // follow up with a POST to /customer-session. Someone who has just created
        // the account is self-evidently its owner, and the follow-up call is
        // fire-and-forget in the UI — if it failed, the new customer would hold
        // React state with no cookie and the next authenticated call (adding a
        // second dog) would 401.
        const response = NextResponse.json(
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

        response.cookies.set(
            CUSTOMER_COOKIE,
            signSession({ realm: 'customer', owner_id: newOwnerId }, SESSION_TTL_SECONDS),
            SESSION_COOKIE_OPTIONS
        );

        return response;

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