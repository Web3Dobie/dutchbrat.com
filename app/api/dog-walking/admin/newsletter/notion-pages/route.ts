import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { notion } from "@/lib/notionParser";

// GET - List newsletter pages from the Notion database
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    const databaseId = process.env.NOTION_NEWSLETTER_DB_ID;
    if (!databaseId) {
        return NextResponse.json(
            { error: "NOTION_NEWSLETTER_DB_ID not configured" },
            { status: 500 }
        );
    }

    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [
                { property: "Month", direction: "descending" }
            ],
            page_size: 20,
        });

        const pages = response.results.map((page: any) => {
            const titleProp = Object.values(page.properties).find((p: any) => p.type === 'title') as any;
            const title = titleProp?.title?.map((t: any) => t.plain_text || '').join('') || 'Untitled';

            const statusProp = page.properties.Status;
            const status = statusProp?.select?.name || 'Draft';

            const monthProp = page.properties.Month;
            const month = monthProp?.date?.start || null;

            return {
                id: page.id,
                title,
                status,
                month,
                last_edited: page.last_edited_time,
            };
        });

        return NextResponse.json({ pages });
    } catch (error: any) {
        console.error("Failed to fetch Notion newsletter pages:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch Notion pages" },
            { status: 500 }
        );
    }
}
