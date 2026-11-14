import { NextRequest, NextResponse } from "next/server";
import { getPool } from '@/lib/database';
import { getOwnerIdFromSession } from '@/lib/customerAuth';

export const dynamic = "force-dynamic";

// Database Connection
const pool = getPool();

// The owner_id now comes from the shared, signature-verifying helper. This file
// used to carry its own copy that base64-decoded the cookie; left in place it
// would reject every signed token and break the gallery outright.

// GET - Fetch customer's media grouped by month
export async function GET(request: NextRequest) {
    const ownerId = getOwnerIdFromSession(request);

    if (!ownerId) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const client = await pool.connect();

    try {
        // Fetch all media for this customer, ordered by date
        const result = await client.query(
            `
            SELECT
                id,
                filename,
                file_path,
                media_type,
                file_size,
                taken_at,
                uploaded_at,
                description,
                thumbnail_path
            FROM hunters_hounds.client_media
            WHERE owner_id = $1
            ORDER BY taken_at DESC NULLS LAST, uploaded_at DESC
        `,
            [ownerId]
        );

        // Group media by month
        const mediaByMonth: Record<string, typeof result.rows> = {};

        for (const row of result.rows) {
            // Use taken_at if available, otherwise uploaded_at
            const date = row.taken_at
                ? new Date(row.taken_at)
                : new Date(row.uploaded_at);

            // Format as "YYYY-MM" for sorting and "Month Year" for display
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

            if (!mediaByMonth[monthKey]) {
                mediaByMonth[monthKey] = [];
            }

            mediaByMonth[monthKey].push({
                ...row,
                // Add formatted display date
                displayDate: date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                }),
            });
        }

        // Convert to array format sorted by month (newest first)
        const months = Object.keys(mediaByMonth)
            .sort((a, b) => b.localeCompare(a))
            .map((monthKey) => {
                const [year, month] = monthKey.split("-");
                const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                return {
                    key: monthKey,
                    label: date.toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                    }),
                    media: mediaByMonth[monthKey],
                };
            });

        return NextResponse.json({
            success: true,
            months,
            total: result.rows.length,
        });
    } catch (error) {
        console.error("Failed to fetch customer media:", error);
        return NextResponse.json(
            { error: "Failed to fetch media" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
