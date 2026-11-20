import { NextResponse } from "next/server";
import { getPublicNewsletters } from '@/lib/publicContent';

export const dynamic = 'force-dynamic';

// GET - Public: list all sent newsletters (no auth required)
export async function GET() {
    try {
        return NextResponse.json({ success: true, newsletters: await getPublicNewsletters() });
    } catch (error) {
        console.error("Public newsletter list error:", error);
        return NextResponse.json({ error: "Failed to fetch newsletters" }, { status: 500 });
    }
}
