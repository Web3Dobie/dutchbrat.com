import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { sendEmail } from "@/lib/emailService";
import { generateChristmasEmail, type ChristmasEmailData } from "@/lib/emailTemplates";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

interface CustomerWithDogs {
    owner_name: string;
    email: string;
    dog_names: string;
}

interface EmailSendResult {
    email: string;
    customerName: string;
    dogNames: string;
    success: boolean;
    error?: string;
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    console.log("🎄 Starting Christmas email campaign...");

    const client = await pool.connect();

    try {
        // Fetch all customers with their dogs
        const query = `
            SELECT 
                o.owner_name, 
                o.email,
                COALESCE(
                    STRING_AGG(d.dog_name, ' & ' ORDER BY d.dog_name), 
                    'your furry friend'
                ) as dog_names
            FROM hunters_hounds.owners o 
            LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id 
            WHERE o.email IS NOT NULL AND o.email != ''
            GROUP BY o.id, o.owner_name, o.email
            ORDER BY o.owner_name;
        `;

        const result = await client.query(query);
        const customers: CustomerWithDogs[] = result.rows;

        console.log(`📧 Found ${customers.length} customers to email`);

        if (customers.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No customers found with valid email addresses",
                summary: {
                    totalCustomers: 0,
                    emailsSent: 0,
                    emailsFailed: 0
                }
            });
        }

        // Send emails to each customer individually
        const emailResults: EmailSendResult[] = [];
        let emailsSent = 0;
        let emailsFailed = 0;

        for (const customer of customers) {
            try {
                const emailData: ChristmasEmailData = {
                    ownerName: customer.owner_name,
                    dogNames: customer.dog_names
                };

                const emailContent = generateChristmasEmail(emailData);
                const subject = "Christmas Wishes from Hunter's Hounds 🎄";

                // Send individual email (no BCC, completely private)
                await sendEmail({
                    to: customer.email,
                    subject: subject,
                    html: emailContent,
                });

                emailResults.push({
                    email: customer.email,
                    customerName: customer.owner_name,
                    dogNames: customer.dog_names,
                    success: true
                });

                emailsSent++;
                console.log(`✅ Email sent to ${customer.owner_name} (${customer.email})`);

                // Small delay to avoid overwhelming the email service
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (emailError) {
                console.error(`❌ Failed to send email to ${customer.owner_name} (${customer.email}):`, emailError);

                emailResults.push({
                    email: customer.email,
                    customerName: customer.owner_name,
                    dogNames: customer.dog_names,
                    success: false,
                    error: emailError instanceof Error ? emailError.message : "Unknown error"
                });

                emailsFailed++;
            }
        }

        // Return comprehensive summary
        const summary = {
            totalCustomers: customers.length,
            emailsSent,
            emailsFailed,
            successRate: `${Math.round((emailsSent / customers.length) * 100)}%`
        };

        console.log(`🎄 Christmas email campaign completed:`, summary);

        return NextResponse.json({
            success: true,
            message: `Christmas email campaign completed! Sent ${emailsSent} emails to customers.`,
            summary,
            details: emailResults
        });

    } catch (error) {
        console.error("❌ Christmas email campaign failed:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to send Christmas emails",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// Also support GET for testing (just returns customer count)
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const client = await pool.connect();

    try {
        const countQuery = `
            SELECT COUNT(*) as total_customers
            FROM hunters_hounds.owners 
            WHERE email IS NOT NULL AND email != '';
        `;

        const result = await client.query(countQuery);
        const totalCustomers = result.rows[0].total_customers;

        return NextResponse.json({
            message: "Christmas email endpoint ready",
            totalCustomers: parseInt(totalCustomers),
            note: "Use POST method to send the actual emails"
        });

    } catch (error) {
        console.error("Failed to get customer count:", error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}