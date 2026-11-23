import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { sendEmail } from "@/lib/emailService";
import { generateNewsletterEmail } from "@/lib/emailTemplates";
import { htmlToText } from "@/lib/htmlToText";
import { getPool } from '@/lib/database';
import { addTracking } from '@/lib/newsletterTracking';

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
                // Owner 0 = test: links go through the same redirect as the real
                // send, so they can be checked, but nothing is recorded.
                const testHtml = addTracking(
                    emailHtml.replace('{{UNSUBSCRIBE_URL}}', '#'),
                    { newsletterId: newsletter_id, ownerId: 0, isPartner: false }
                );

                await sendEmail({
                    to: test_email,
                    subject: `[TEST] ${newsletter.title}`,
                    html: testHtml,
                    text: htmlToText(emailHtml.replace('{{UNSUBSCRIBE_URL}}', '#')),
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

        // Production mode: send to all subscribed customers (including individually subscribed partners)
        const subscribersQuery = `
            SELECT id, owner_name, email, partner_email,
                   newsletter_subscribed, newsletter_unsubscribe_token,
                   partner_newsletter_subscribed, partner_newsletter_unsubscribe_token
            FROM hunters_hounds.owners
            WHERE (newsletter_subscribed = true OR partner_newsletter_subscribed = true)
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

        // Build list of all emails to send to (primary + partner, each with their own token)
        const emailsToSend: { email: string; ownerId: number; unsubscribeToken: string; isPrimary: boolean }[] = [];

        for (const subscriber of subscribers) {
            // Primary owner - only if individually subscribed
            if (subscriber.newsletter_subscribed) {
                emailsToSend.push({
                    email: subscriber.email,
                    ownerId: subscriber.id,
                    unsubscribeToken: subscriber.newsletter_unsubscribe_token,
                    isPrimary: true,
                });
            }

            // Partner - only if they have an email and are individually subscribed
            if (subscriber.partner_newsletter_subscribed
                && subscriber.partner_email && subscriber.partner_email.trim() !== '') {
                emailsToSend.push({
                    email: subscriber.partner_email.trim(),
                    ownerId: subscriber.id,
                    unsubscribeToken: subscriber.partner_newsletter_unsubscribe_token,
                    isPrimary: false,
                });
            }
        }

        // Send to each recipient
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (const recipient of emailsToSend) {
            try {
                // Generate personalized email with unsubscribe link
                const unsubscribeUrl = `https://hunters-hounds.london/newsletter/unsubscribe?token=${recipient.unsubscribeToken}`;
                // Each copy gets its own signed open pixel and link redirects
                // (lib/newsletterTracking.ts); the unsubscribe link is left direct.
                // Plain-text twin of the same copy (untracked, readable links)
                // and the unsubscribe header mail providers expect on bulk
                // mail. The header's URL only acts on a POST (RFC 8058), so a
                // scanner that merely opens it changes nothing.
                const plainText = htmlToText(emailHtml.replace('{{UNSUBSCRIBE_URL}}', unsubscribeUrl));
                const oneClickUrl = `https://hunters-hounds.london/api/dog-walking/newsletter/unsubscribe/one-click?token=${recipient.unsubscribeToken}`;
                const personalizedHtml = addTracking(
                    emailHtml.replace('{{UNSUBSCRIBE_URL}}', unsubscribeUrl),
                    { newsletterId: newsletter_id, ownerId: recipient.ownerId, isPartner: !recipient.isPrimary }
                );

                // Retry up to 3 times on rate-limit errors
                let sent = false;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        await sendEmail({
                            to: recipient.email,
                            subject: newsletter.title,
                            html: personalizedHtml,
                            text: plainText,
                            headers: {
                                'List-Unsubscribe': `<${oneClickUrl}>`,
                                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                            },
                            skipBusinessBcc: true,
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

                // Record in history (only for primary to avoid duplicate owner entries)
                if (recipient.isPrimary) {
                    await client.query(`
                        INSERT INTO hunters_hounds.newsletter_history
                        (newsletter_id, owner_id, email_status)
                        VALUES ($1, $2, 'sent');
                    `, [newsletter_id, recipient.ownerId]);
                }

                successCount++;

                // Delay between sends to stay under Resend rate limit (2 req/sec)
                await new Promise(resolve => setTimeout(resolve, 600));

            } catch (emailError: any) {
                failCount++;
                errors.push(`${recipient.email}: ${emailError.message}`);

                // Record failure in history (only for primary)
                if (recipient.isPrimary) {
                    await client.query(`
                        INSERT INTO hunters_hounds.newsletter_history
                        (newsletter_id, owner_id, email_status)
                        VALUES ($1, $2, 'failed');
                    `, [newsletter_id, recipient.ownerId]);
                }
            }
        }

        // Mark newsletter as sent
        await client.query(`
            UPDATE hunters_hounds.newsletters
            SET sent_at = CURRENT_TIMESTAMP, recipient_count = $1, tracked = true
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
