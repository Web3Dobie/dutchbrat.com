import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { sendEmail } from "@/lib/emailService";
import { generateNewsletterEmail } from "@/lib/emailTemplates";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

interface SendNewsletterRequest {
    newsletter_id: number;
    test_email?: string;  // If provided, send only to this email (test mode)
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const client = await pool.connect();

    try {
        const data: SendNewsletterRequest = await request.json();
        const { newsletter_id, test_email } = data;

        if (!newsletter_id) {
            return NextResponse.json(
                { error: "newsletter_id is required" },
                { status: 400 }
            );
        }

        // Fetch the newsletter
        const newsletterQuery = `
            SELECT id, title, content_json, sent_at
            FROM hunters_hounds.newsletters
            WHERE id = $1;
        `;
        const newsletterResult = await client.query(newsletterQuery, [newsletter_id]);

        if (newsletterResult.rows.length === 0) {
            return NextResponse.json(
                { error: "Newsletter not found" },
                { status: 404 }
            );
        }

        const newsletter = newsletterResult.rows[0];

        // Don't allow re-sending (unless test mode)
        if (newsletter.sent_at && !test_email) {
            return NextResponse.json(
                { error: "This newsletter has already been sent" },
                { status: 400 }
            );
        }

        // Generate email HTML
        const emailHtml = generateNewsletterEmail(newsletter.content_json);

        // Test mode: send to single email
        if (test_email) {
            try {
                await sendEmail({
                    to: test_email,
                    subject: `[TEST] ${newsletter.title}`,
                    html: emailHtml,
                });

                return NextResponse.json({
                    success: true,
                    message: `Test email sent to ${test_email}`,
                    test_mode: true
                });
            } catch (emailError) {
                console.error("Test email failed:", emailError);
                return NextResponse.json(
                    { error: "Failed to send test email" },
                    { status: 500 }
                );
            }
        }

        // Production mode: send to all subscribed customers
        const subscribersQuery = `
            SELECT id, owner_name, email, newsletter_unsubscribe_token
            FROM hunters_hounds.owners
            WHERE newsletter_subscribed = true
            AND email IS NOT NULL
            AND email != '';
        `;
        const subscribersResult = await client.query(subscribersQuery);
        const subscribers = subscribersResult.rows;

        if (subscribers.length === 0) {
            return NextResponse.json(
                { error: "No subscribers found" },
                { status: 400 }
            );
        }

        // Send to each subscriber
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (const subscriber of subscribers) {
            try {
                // Generate personalized email with unsubscribe link
                const unsubscribeUrl = `https://hunters-hounds.london/newsletter/unsubscribe?token=${subscriber.newsletter_unsubscribe_token}`;
                const personalizedHtml = emailHtml.replace(
                    '{{UNSUBSCRIBE_URL}}',
                    unsubscribeUrl
                );

                await sendEmail({
                    to: subscriber.email,
                    subject: newsletter.title,
                    html: personalizedHtml,
                });

                // Record in history
                await client.query(`
                    INSERT INTO hunters_hounds.newsletter_history
                    (newsletter_id, owner_id, email_status)
                    VALUES ($1, $2, 'sent');
                `, [newsletter_id, subscriber.id]);

                successCount++;

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (emailError: any) {
                failCount++;
                errors.push(`${subscriber.email}: ${emailError.message}`);

                // Record failure in history
                await client.query(`
                    INSERT INTO hunters_hounds.newsletter_history
                    (newsletter_id, owner_id, email_status)
                    VALUES ($1, $2, 'failed');
                `, [newsletter_id, subscriber.id]);
            }
        }

        // Mark newsletter as sent
        await client.query(`
            UPDATE hunters_hounds.newsletters
            SET sent_at = CURRENT_TIMESTAMP, recipient_count = $1
            WHERE id = $2;
        `, [successCount, newsletter_id]);

        return NextResponse.json({
            success: true,
            message: `Newsletter sent to ${successCount} recipients`,
            sent_count: successCount,
            failed_count: failCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error("Newsletter send error:", error);
        return NextResponse.json(
            { error: "Failed to send newsletter" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
