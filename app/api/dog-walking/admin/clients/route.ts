import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { getPool } from '@/lib/database';

// Database connection (same as other admin APIs)
const pool = getPool();

interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
    dog_age: number;
    image_filename: string | null;
}

interface Client {
    id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    created_at: string;
    // Partner fields (optional in list view)
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
    // Vet & Insurance fields (optional in list view)
    vet_info?: string | null;
    pet_insurance?: string | null;
    // Photo sharing consent
    photo_sharing_consent?: boolean;
    // Extended travel time (30 min instead of 15 min)
    extended_travel_time?: boolean;
    // Payment preference
    payment_preference?: string | null;
    dogs: Dog[];
    // Loyalty card data
    loyalty?: {
        qualifying_walks: number;
        stamps_on_card: number;
        available_to_redeem: number;
    };
}

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Extract query parameters with defaults
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const sort = searchParams.get("sort") || "id_desc";
    const search = searchParams.get("search") || "";

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
        return NextResponse.json(
            { error: "Invalid pagination parameters" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Build the search condition
        let searchCondition = "";
        let searchValues: string[] = [];
        let paramIndex = 1;

        if (search.trim()) {
            const searchTerm = `%${search.trim().toLowerCase()}%`;
            searchCondition = `
                WHERE (
                    LOWER(o.owner_name) LIKE $${paramIndex} OR 
                    o.phone LIKE $${paramIndex} OR 
                    LOWER(d.dog_name) LIKE $${paramIndex}
                )
            `;
            searchValues.push(searchTerm);
            paramIndex++;
        }

        // Determine sort order
        let orderBy = "o.id DESC"; // Default: newest clients first
        if (sort === "id_asc") orderBy = "o.id ASC";
        else if (sort === "name_asc") orderBy = "o.owner_name ASC";
        else if (sort === "name_desc") orderBy = "o.owner_name DESC";

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Main query to get clients with their dogs - FIXED: Removed DISTINCT
        const mainQuery = `
            SELECT
                o.id,
                o.owner_name,
                o.phone,
                o.email,
                o.address,
                o.created_at,
                o.extended_travel_time,
                o.payment_preference,
                COALESCE(
                    json_agg(
                        CASE
                            WHEN d.id IS NOT NULL
                            THEN json_build_object(
                                'id', d.id,
                                'dog_name', d.dog_name,
                                'dog_breed', COALESCE(d.dog_breed, 'Unknown'),
                                'dog_age', COALESCE(d.dog_age, 0),
                                'image_filename', d.image_filename
                            )
                            ELSE NULL
                        END
                        ORDER BY d.id
                    ) FILTER (WHERE d.id IS NOT NULL),
                    '[]'::json
                ) as dogs
            FROM hunters_hounds.owners o
            LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id
            ${searchCondition}
            GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at, o.extended_travel_time, o.payment_preference
            ORDER BY ${orderBy}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        // Count query for pagination - FIXED: Removed DISTINCT, use subquery
        const countQuery = `
            SELECT COUNT(*) as total
            FROM (
                SELECT o.id
                FROM hunters_hounds.owners o
                LEFT JOIN hunters_hounds.dogs d ON o.id = d.owner_id
                ${searchCondition}
                GROUP BY o.id
            ) as unique_owners
        `;

        // Execute queries
        const queryParams = [...searchValues, limit, offset];
        const countParams = searchValues;

        const [clientsResult, countResult] = await Promise.all([
            client.query(mainQuery, queryParams),
            client.query(countQuery, countParams)
        ]);

        // Batch-fetch loyalty data for the page's client IDs
        const clientIds = clientsResult.rows.map((r: { id: number }) => r.id);
        const loyaltyMap: Record<number, { qualifying_walks: number; stamps_on_card: number; available_to_redeem: number }> = {};

        if (clientIds.length > 0) {
            const [loyaltyWalksResult, loyaltyRedemptionsResult] = await Promise.all([
                client.query(
                    `SELECT b.owner_id, COUNT(b.id)::int as qualifying_walks
                     FROM hunters_hounds.bookings b
                     LEFT JOIN hunters_hounds.loyalty_redemptions lr ON lr.booking_id = b.id
                     WHERE b.owner_id = ANY($1)
                       AND b.service_type IN ('solo', 'quick')
                       AND b.status IN ('completed', 'completed & paid')
                       AND lr.id IS NULL
                     GROUP BY b.owner_id`,
                    [clientIds]
                ),
                client.query(
                    `SELECT owner_id, COUNT(*)::int as redemptions
                     FROM hunters_hounds.loyalty_redemptions
                     WHERE owner_id = ANY($1)
                     GROUP BY owner_id`,
                    [clientIds]
                )
            ]);

            const redemptionCounts: Record<number, number> = {};
            for (const row of loyaltyRedemptionsResult.rows) {
                redemptionCounts[row.owner_id] = row.redemptions;
            }

            for (const row of loyaltyWalksResult.rows) {
                const walks = row.qualifying_walks;
                const redeemed = redemptionCounts[row.owner_id] || 0;
                loyaltyMap[row.owner_id] = {
                    qualifying_walks: walks,
                    stamps_on_card: walks % 15,
                    available_to_redeem: Math.max(0, Math.floor(walks / 15) - redeemed),
                };
            }
        }

        const clients: Client[] = clientsResult.rows.map(row => ({
            id: row.id,
            owner_name: row.owner_name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            created_at: row.created_at,
            extended_travel_time: row.extended_travel_time || false,
            payment_preference: row.payment_preference || 'per_service',
            dogs: Array.isArray(row.dogs) ? row.dogs : [],
            loyalty: loyaltyMap[row.id] || { qualifying_walks: 0, stamps_on_card: 0, available_to_redeem: 0 },
        }));

        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        // Return paginated results
        return NextResponse.json({
            success: true,
            clients,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            // Include flat structure for backward compatibility
            total,
            totalPages
        });

    } catch (error) {
        console.error("Failed to fetch clients:", error);
        return NextResponse.json(
            { 
                error: "Database error occurred while fetching clients",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// POST method for future bulk operations (optional)
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    return NextResponse.json(
        { error: "POST method not implemented yet" },
        { status: 501 }
    );
}