import { NextResponse, type NextRequest } from "next/server";
import { getPublicReviews } from '@/lib/publicContent';

// GET - Fetch all published reviews
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    try {
        const data = await getPublicReviews(limit, offset);
        return NextResponse.json({ success: true, ...data });
    } catch (error) {
        console.error("Error fetching public reviews:", error);
        return NextResponse.json(
            { error: "Failed to fetch reviews" },
            { status: 500 }
        );
    }
}
