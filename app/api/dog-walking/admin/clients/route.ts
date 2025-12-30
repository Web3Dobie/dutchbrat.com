import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

// Database connection (same as other admin APIs)
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "agents_platform",
    user: process.env.POSTGRES_USER || "hunter_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
});

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
    dogs: Dog[];
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
            GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at
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

        const clients: Client[] = clientsResult.rows.map(row => ({
            id: row.id,
            owner_name: row.owner_name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            created_at: row.created_at,
            dogs: Array.isArray(row.dogs) ? row.dogs : []
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