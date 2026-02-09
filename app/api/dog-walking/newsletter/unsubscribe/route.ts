import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';

// Database Connection
const pool = getPool();

// GET - Unsubscribe via token (public endpoint - no auth required)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json(
            { error: "Missing unsubscribe token" },
            { status: 400 }
        );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
        return NextResponse.json(
            { error: "Invalid token format" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Try primary owner token first
        const primaryResult = await client.query(`
            UPDATE hunters_hounds.owners
            SET newsletter_subscribed = false
            WHERE newsletter_unsubscribe_token = $1
            RETURNING owner_name, email;
        `, [token]);

        if (primaryResult.rows.length > 0) {
            return NextResponse.json({
                success: true,
                message: "Successfully unsubscribed from Hunter's Pack newsletter",
                email: primaryResult.rows[0].email
            });
        }

        // Try partner token
        const partnerResult = await client.query(`
            UPDATE hunters_hounds.owners
            SET partner_newsletter_subscribed = false
            WHERE partner_newsletter_unsubscribe_token = $1
            RETURNING partner_email;
        `, [token]);

        if (partnerResult.rows.length > 0) {
            return NextResponse.json({
                success: true,
                message: "Successfully unsubscribed from Hunter's Pack newsletter",
                email: partnerResult.rows[0].partner_email
            });
        }

        return NextResponse.json(
            { error: "Invalid or expired unsubscribe link" },
            { status: 404 }
        );

    } catch (error) {
        console.error("Unsubscribe error:", error);
        return NextResponse.json(
            { error: "Failed to process unsubscribe request" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// POST - Resubscribe (for future use)
export async function POST(request: NextRequest) {
    const client = await pool.connect();

    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: "Missing token" },
                { status: 400 }
            );
        }

        // Try primary owner token first
        const primaryResult = await client.query(`
            UPDATE hunters_hounds.owners
            SET newsletter_subscribed = true
            WHERE newsletter_unsubscribe_token = $1
            RETURNING owner_name, email;
        `, [token]);

        if (primaryResult.rows.length > 0) {
            return NextResponse.json({
                success: true,
                message: "Successfully resubscribed to Hunter's Pack newsletter"
            });
        }

        // Try partner token
        const partnerResult = await client.query(`
            UPDATE hunters_hounds.owners
            SET partner_newsletter_subscribed = true
            WHERE partner_newsletter_unsubscribe_token = $1
            RETURNING partner_email;
        `, [token]);

        if (partnerResult.rows.length > 0) {
            return NextResponse.json({
                success: true,
                message: "Successfully resubscribed to Hunter's Pack newsletter"
            });
        }

        return NextResponse.json(
            { error: "Invalid token" },
            { status: 404 }
        );

    } catch (error) {
        console.error("Resubscribe error:", error);
        return NextResponse.json(
            { error: "Failed to process resubscribe request" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
