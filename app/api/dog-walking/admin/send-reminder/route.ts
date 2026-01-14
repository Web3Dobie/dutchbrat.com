import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { sendEmail } from "@/lib/emailService";
import { generatePaymentReminderEmail, type PaymentReminderEmailData } from "@/lib/emailTemplates";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { format, parseISO } from "date-fns";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

interface SendReminderRequest {
    owner_id: number;
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    let requestData: SendReminderRequest;
    try {
        requestData = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    const { owner_id } = requestData;

    if (!owner_id) {
        return NextResponse.json(
            { error: "owner_id is required" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Fetch owner details
        const ownerQuery = `
            SELECT
                id, owner_name, email, partner_email
            FROM hunters_hounds.owners
            WHERE id = $1
        `;
        const ownerResult = await client.query(ownerQuery, [owner_id]);

        if (ownerResult.rows.length === 0) {
            return NextResponse.json(
                { error: "Customer not found" },
                { status: 404 }
            );
        }

        const owner = ownerResult.rows[0];

        // Fetch all completed (unpaid) bookings for this customer
        const bookingsQuery = `
            SELECT
                b.id,
                b.service_type,
                b.start_time,
                b.price_pounds,
                CASE
                    WHEN d2.dog_name IS NOT NULL THEN d1.dog_name || ' & ' || d2.dog_name
                    ELSE d1.dog_name
                END as dog_names
            FROM hunters_hounds.bookings b
            JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
            LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
            WHERE b.owner_id = $1
            AND b.status = 'completed'
            AND b.price_pounds > 0
            ORDER BY b.start_time ASC
        `;
        const bookingsResult = await client.query(bookingsQuery, [owner_id]);

        if (bookingsResult.rows.length === 0) {
            return NextResponse.json(
                { error: "No unpaid bookings found for this customer" },
                { status: 400 }
            );
        }

        // Get dog names from first booking for email
        const dogNames = bookingsResult.rows[0].dog_names;

        // Format services for email
        const services = bookingsResult.rows.map(row => ({
            date: format(parseISO(row.start_time), "EEEE, d MMMM yyyy"),
            serviceType: row.service_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            price: parseFloat(row.price_pounds)
        }));

        // Calculate total
        const totalAmount = services.reduce((sum, s) => sum + s.price, 0);

        // Generate email
        const emailData: PaymentReminderEmailData = {
            ownerName: owner.owner_name.split(' ')[0], // First name only
            dogNames: dogNames,
            services: services,
            totalAmount: totalAmount
        };

        const { subject, html } = generatePaymentReminderEmail(emailData);

        // Build recipients list
        const recipients: string[] = [owner.email];
        if (owner.partner_email && owner.partner_email.trim()) {
            recipients.push(owner.partner_email);
        }

        // Send email
        await sendEmail({
            to: recipients,
            bcc: ["bookings@hunters-hounds.london"],
            subject: subject,
            html: html,
        });

        console.log(`Payment reminder sent to ${owner.owner_name} (${recipients.join(', ')}) - £${totalAmount.toFixed(2)}`);

        return NextResponse.json({
            success: true,
            message: `Payment reminder sent to ${owner.owner_name}`,
            details: {
                recipients: recipients,
                bookingCount: services.length,
                totalAmount: totalAmount
            }
        });

    } catch (error) {
        console.error("Failed to send payment reminder:", error);
        return NextResponse.json(
            {
                error: "Failed to send payment reminder",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
