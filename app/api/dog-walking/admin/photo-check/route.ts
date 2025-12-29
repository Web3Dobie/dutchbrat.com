import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

// POST - Generate filename for dog photo
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    let requestData: {
        dog_name?: string;
        owner_name?: string;
        dog_id?: number;
    };

    try {
        requestData = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON data" },
            { status: 400 }
        );
    }

    const { dog_name, owner_name, dog_id } = requestData;

    if (!dog_name || !owner_name || !dog_id) {
        return NextResponse.json(
            { error: "dog_name, owner_name, and dog_id are required" },
            { status: 400 }
        );
    }

    try {
        // Generate filename: dogname_ownerlastname_dogid.jpg
        const cleanDogName = dog_name.toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove special chars and spaces
            .substring(0, 15); // Limit length

        // Extract last name (assume format: "First Last" or just "Name")
        const nameParts = owner_name.trim().split(' ');
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
        const cleanLastName = lastName.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 15);

        const suggestedFilename = `${cleanDogName}_${cleanLastName}_${dog_id}.jpg`;

        return NextResponse.json({
            success: true,
            suggestedFilename,
            path: `/images/dogs/${suggestedFilename}`,
            instructions: "Upload this file via Filezilla to /public/images/dogs/"
        });

    } catch (error) {
        console.error("Filename generation error:", error);
        return NextResponse.json(
            { 
                error: "Error generating filename",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}