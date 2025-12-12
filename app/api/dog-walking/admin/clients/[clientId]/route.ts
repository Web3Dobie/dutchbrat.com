import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";

// Database connection
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

interface ClientDetails {
    id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    created_at: string;
    // NEW: Partner fields
    partner_name: string | null;
    partner_email: string | null;
    partner_phone: string | null;
    dogs: Dog[];
}

interface UpdateClientRequest {
    owner_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    // NEW: Partner fields
    partner_name?: string;
    partner_email?: string;
    partner_phone?: string;
    dogs?: {
        id: number;
        dog_name?: string;
        dog_breed?: string;
        dog_age?: number;
        image_filename?: string | null;
    }[];
}

// GET - Fetch single client
export async function GET(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    const clientId = parseInt(params.clientId);

    if (isNaN(clientId)) {
        return NextResponse.json(
            { error: "Invalid client ID" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Updated query to include partner fields
        const query = `
            SELECT 
                o.id,
                o.owner_name,
                o.phone,
                o.email,
                o.address,
                o.created_at,
                o.partner_name,
                o.partner_email,
                o.partner_phone,
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
            WHERE o.id = $1
            GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at, o.partner_name, o.partner_email, o.partner_phone
        `;

        const result = await client.query(query, [clientId]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Client not found" },
                { status: 404 }
            );
        }

        const clientData: ClientDetails = {
            ...result.rows[0],
            dogs: Array.isArray(result.rows[0].dogs) ? result.rows[0].dogs : []
        };

        return NextResponse.json({
            success: true,
            client: clientData
        });

    } catch (error) {
        console.error("Failed to fetch client:", error);
        return NextResponse.json(
            {
                error: "Database error occurred while fetching client",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// PUT - Update client and dogs (NOW WITH PARTNER SUPPORT)
export async function PUT(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    const clientId = parseInt(params.clientId);

    if (isNaN(clientId)) {
        return NextResponse.json(
            { error: "Invalid client ID" },
            { status: 400 }
        );
    }

    let updateData: UpdateClientRequest;
    try {
        updateData = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Update owner information if provided (INCLUDING PARTNER FIELDS)
        const ownerFields = ['owner_name', 'phone', 'email', 'address', 'partner_name', 'partner_email', 'partner_phone'];
        const hasOwnerUpdate = ownerFields.some(field => field in updateData);

        if (hasOwnerUpdate) {
            const ownerUpdates: string[] = [];
            const ownerValues: any[] = [];
            let paramIndex = 1;

            if (updateData.owner_name !== undefined) {
                ownerUpdates.push(`owner_name = $${paramIndex}`);
                ownerValues.push(updateData.owner_name?.trim() || null);
                paramIndex++;
            }
            if (updateData.phone !== undefined) {
                ownerUpdates.push(`phone = $${paramIndex}`);
                ownerValues.push(updateData.phone?.trim() || null);
                paramIndex++;
            }
            if (updateData.email !== undefined) {
                ownerUpdates.push(`email = $${paramIndex}`);
                ownerValues.push(updateData.email?.trim() || null);
                paramIndex++;
            }
            if (updateData.address !== undefined) {
                ownerUpdates.push(`address = $${paramIndex}`);
                ownerValues.push(updateData.address?.trim() || null);
                paramIndex++;
            }

            // NEW: Partner fields support
            if (updateData.partner_name !== undefined) {
                ownerUpdates.push(`partner_name = $${paramIndex}`);
                ownerValues.push(updateData.partner_name?.trim() || null);
                paramIndex++;
            }
            if (updateData.partner_email !== undefined) {
                ownerUpdates.push(`partner_email = $${paramIndex}`);
                ownerValues.push(updateData.partner_email?.trim() || null);
                paramIndex++;
            }
            if (updateData.partner_phone !== undefined) {
                ownerUpdates.push(`partner_phone = $${paramIndex}`);
                ownerValues.push(updateData.partner_phone?.trim() || null);
                paramIndex++;
            }

            if (ownerUpdates.length > 0) {
                const ownerQuery = `
                    UPDATE hunters_hounds.owners 
                    SET ${ownerUpdates.join(', ')}
                    WHERE id = $${paramIndex}
                    RETURNING *
                `;
                ownerValues.push(clientId);

                const ownerResult = await client.query(ownerQuery, ownerValues);
                if (ownerResult.rows.length === 0) {
                    await client.query("ROLLBACK");
                    return NextResponse.json(
                        { error: "Client not found" },
                        { status: 404 }
                    );
                }
            }
        }

        // Update dogs if provided (unchanged from original)
        if (updateData.dogs && Array.isArray(updateData.dogs)) {
            for (const dogUpdate of updateData.dogs) {
                if (!dogUpdate.id) continue;

                const dogUpdates: string[] = [];
                const dogValues: any[] = [];
                let paramIndex = 1;

                if (dogUpdate.dog_name !== undefined) {
                    dogUpdates.push(`dog_name = $${paramIndex}`);
                    dogValues.push(dogUpdate.dog_name?.trim() || null);
                    paramIndex++;
                }
                if (dogUpdate.dog_breed !== undefined) {
                    dogUpdates.push(`dog_breed = $${paramIndex}`);
                    dogValues.push(dogUpdate.dog_breed?.trim() || null);
                    paramIndex++;
                }
                if (dogUpdate.dog_age !== undefined) {
                    dogUpdates.push(`dog_age = $${paramIndex}`);
                    dogValues.push(dogUpdate.dog_age);
                    paramIndex++;
                }
                if (dogUpdate.image_filename !== undefined) {
                    dogUpdates.push(`image_filename = $${paramIndex}`);
                    dogValues.push(dogUpdate.image_filename?.trim() || null);
                    paramIndex++;
                }

                if (dogUpdates.length > 0) {
                    const dogQuery = `
                        UPDATE hunters_hounds.dogs 
                        SET ${dogUpdates.join(', ')}
                        WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
                        RETURNING *
                    `;
                    dogValues.push(dogUpdate.id, clientId);

                    await client.query(dogQuery, dogValues);
                }
            }
        }

        await client.query("COMMIT");

        // Fetch and return updated client data (with partner fields)
        const updatedQuery = `
            SELECT 
                o.id,
                o.owner_name,
                o.phone,
                o.email,
                o.address,
                o.created_at,
                o.partner_name,
                o.partner_email,
                o.partner_phone,
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
            WHERE o.id = $1
            GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at, o.partner_name, o.partner_email, o.partner_phone
        `;

        const result = await client.query(updatedQuery, [clientId]);

        return NextResponse.json({
            success: true,
            message: "Client updated successfully",
            client: result.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Failed to update client:", error);
        return NextResponse.json(
            {
                error: "Database error occurred while updating client",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

// DELETE method (for future use)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    return NextResponse.json(
        { error: "DELETE method not implemented yet" },
        { status: 501 }
    );
}