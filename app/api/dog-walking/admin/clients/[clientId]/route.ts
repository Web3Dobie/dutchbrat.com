import { NextResponse, type NextRequest } from "next/server";
import { getPool } from '@/lib/database';
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

const pool = getPool();

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
    // Partner fields
    partner_name: string | null;
    partner_email: string | null;
    partner_phone: string | null;
    // Vet & Insurance fields
    vet_info: string | null;
    pet_insurance: string | null;
    // Photo sharing consent
    photo_sharing_consent: boolean;
    // Extended travel time (30 min instead of 15 min)
    extended_travel_time: boolean;
    // Payment preference
    payment_preference: string | null;
    dogs: Dog[];
}

interface UpdateClientRequest {
    owner_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    // Partner fields
    partner_name?: string;
    partner_email?: string;
    partner_phone?: string;
    // Vet & Insurance fields
    vet_info?: string;
    pet_insurance?: string;
    // Photo sharing consent
    photo_sharing_consent?: boolean;
    // Extended travel time (30 min instead of 15 min)
    extended_travel_time?: boolean;
    // Payment preference
    payment_preference?: string;
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
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const clientId = parseInt(params.clientId);

    if (isNaN(clientId)) {
        return NextResponse.json(
            { error: "Invalid client ID" },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        // Updated query to include partner, vet, insurance, photo consent, extended travel time, and payment preference fields
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
                o.vet_info,
                o.pet_insurance,
                o.photo_sharing_consent,
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
            WHERE o.id = $1
            GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at, o.partner_name, o.partner_email, o.partner_phone, o.vet_info, o.pet_insurance, o.photo_sharing_consent, o.extended_travel_time, o.payment_preference
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
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

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

        // Update owner information if provided (INCLUDING PARTNER, VET, INSURANCE, PHOTO CONSENT, EXTENDED TRAVEL TIME, AND PAYMENT PREFERENCE FIELDS)
        const ownerFields = ['owner_name', 'phone', 'email', 'address', 'partner_name', 'partner_email', 'partner_phone', 'vet_info', 'pet_insurance', 'photo_sharing_consent', 'extended_travel_time', 'payment_preference'];
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

            // Vet & Insurance fields
            if (updateData.vet_info !== undefined) {
                ownerUpdates.push(`vet_info = $${paramIndex}`);
                ownerValues.push(updateData.vet_info?.trim() || null);
                paramIndex++;
            }
            if (updateData.pet_insurance !== undefined) {
                ownerUpdates.push(`pet_insurance = $${paramIndex}`);
                ownerValues.push(updateData.pet_insurance?.trim() || null);
                paramIndex++;
            }

            // Photo sharing consent
            if (updateData.photo_sharing_consent !== undefined) {
                ownerUpdates.push(`photo_sharing_consent = $${paramIndex}`);
                ownerValues.push(updateData.photo_sharing_consent);
                paramIndex++;
            }

            // Extended travel time
            if (updateData.extended_travel_time !== undefined) {
                ownerUpdates.push(`extended_travel_time = $${paramIndex}`);
                ownerValues.push(updateData.extended_travel_time);
                paramIndex++;
            }

            // Payment preference
            if (updateData.payment_preference !== undefined) {
                ownerUpdates.push(`payment_preference = $${paramIndex}`);
                ownerValues.push(updateData.payment_preference?.trim() || 'per_service');
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

        // Fetch and return updated client data (with partner, vet, insurance, photo consent, extended travel time, and payment preference fields)
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
                o.vet_info,
                o.pet_insurance,
                o.photo_sharing_consent,
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
            WHERE o.id = $1
            GROUP BY o.id, o.owner_name, o.phone, o.email, o.address, o.created_at, o.partner_name, o.partner_email, o.partner_phone, o.vet_info, o.pet_insurance, o.photo_sharing_consent, o.extended_travel_time, o.payment_preference
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
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    return NextResponse.json(
        { error: "DELETE method not implemented yet" },
        { status: 501 }
    );
}