import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
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

// GET - List all newsletters (drafts and sent)
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const client = await pool.connect();

    try {
        const query = `
            SELECT
                id,
                title,
                content_json,
                created_at,
                updated_at,
                sent_at,
                recipient_count
            FROM hunters_hounds.newsletters
            ORDER BY COALESCE(sent_at, created_at) DESC
            LIMIT 50;
        `;

        const result = await client.query(query);

        // Also get subscriber count
        const subscriberCountQuery = `
            SELECT COUNT(*) as count
            FROM hunters_hounds.owners
            WHERE newsletter_subscribed = true;
        `;
        const subscriberResult = await client.query(subscriberCountQuery);

        return NextResponse.json({
            success: true,
            newsletters: result.rows.map(row => ({
                id: row.id,
                title: row.title,
                content: row.content_json,
                created_at: row.created_at,
                updated_at: row.updated_at,
                sent_at: row.sent_at,
                recipient_count: row.recipient_count,
                status: row.sent_at ? 'sent' : 'draft'
            })),
            subscriber_count: parseInt(subscriberResult.rows[0].count)
        });

    } catch (error) {
        console.error("Newsletter list error:", error);
        return NextResponse.json(
            { error: "Failed to fetch newsletters" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// POST - Create or update a newsletter draft
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const client = await pool.connect();

    try {
        const data = await request.json();
        const { id, title, content } = data;

        if (!title || !content) {
            return NextResponse.json(
                { error: "Title and content are required" },
                { status: 400 }
            );
        }

        let result;

        if (id) {
            // Update existing draft
            const updateQuery = `
                UPDATE hunters_hounds.newsletters
                SET title = $1, content_json = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND sent_at IS NULL
                RETURNING id, title, content_json, created_at, updated_at;
            `;
            result = await client.query(updateQuery, [title, JSON.stringify(content), id]);

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { error: "Newsletter not found or already sent" },
                    { status: 404 }
                );
            }
        } else {
            // Create new draft
            const insertQuery = `
                INSERT INTO hunters_hounds.newsletters (title, content_json)
                VALUES ($1, $2)
                RETURNING id, title, content_json, created_at, updated_at;
            `;
            result = await client.query(insertQuery, [title, JSON.stringify(content)]);
        }

        const newsletter = result.rows[0];

        return NextResponse.json({
            success: true,
            newsletter: {
                id: newsletter.id,
                title: newsletter.title,
                content: newsletter.content_json,
                created_at: newsletter.created_at,
                updated_at: newsletter.updated_at,
                status: 'draft'
            },
            message: id ? "Newsletter updated" : "Newsletter draft created"
        });

    } catch (error) {
        console.error("Newsletter save error:", error);
        return NextResponse.json(
            { error: "Failed to save newsletter" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
