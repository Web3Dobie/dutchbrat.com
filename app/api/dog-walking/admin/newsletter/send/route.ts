import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { sendEmail } from "@/lib/emailService";
import { generateNewsletterEmail } from "@/lib/emailTemplates";
import { getPool } from '@/lib/database';

// Database Connection
const pool = getPool();

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
                // Replace unsubscribe placeholder with a harmless link for test emails
                const testHtml = emailHtml.replace('{{UNSUBSCRIBE_URL}}', '#');

                await sendEmail({
                    to: test_email,
                    subject: `[TEST] ${newsletter.title}`,
                    html: testHtml,
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

                // Retry up to 3 times on rate-limit errors
                let sent = false;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        await sendEmail({
                            to: subscriber.email,
                            subject: newsletter.title,
                            html: personalizedHtml,
                        });
                        sent = true;
                        break;
                    } catch (err: any) {
                        if (err.message?.includes('Too many requests') && attempt < 2) {
                            await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
                            continue;
                        }
                        throw err;
                    }
                }

                // Record in history
                await client.query(`
                    INSERT INTO hunters_hounds.newsletter_history
                    (newsletter_id, owner_id, email_status)
                    VALUES ($1, $2, 'sent');
                `, [newsletter_id, subscriber.id]);

                successCount++;

                // Delay between sends to stay under Resend rate limit (2 req/sec)
                await new Promise(resolve => setTimeout(resolve, 600));

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
