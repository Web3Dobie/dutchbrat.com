import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";

// Database Connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

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
        // Find owner by token and update subscription status
        const result = await client.query(`
            UPDATE hunters_hounds.owners
            SET newsletter_subscribed = false
            WHERE newsletter_unsubscribe_token = $1
            RETURNING owner_name, email;
        `, [token]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Invalid or expired unsubscribe link" },
                { status: 404 }
            );
        }

        const owner = result.rows[0];

        return NextResponse.json({
            success: true,
            message: "Successfully unsubscribed from Hunter's Pack newsletter",
            email: owner.email
        });

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

        const result = await client.query(`
            UPDATE hunters_hounds.owners
            SET newsletter_subscribed = true
            WHERE newsletter_unsubscribe_token = $1
            RETURNING owner_name, email;
        `, [token]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Successfully resubscribed to Hunter's Pack newsletter"
        });

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
