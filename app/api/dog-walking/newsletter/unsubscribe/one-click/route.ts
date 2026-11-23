import { NextResponse, type NextRequest } from "next/server";
import { isUnsubscribeToken, unsubscribeByToken } from "@/lib/newsletterUnsubscribe";

export const dynamic = "force-dynamic";

// The address in the newsletter's List-Unsubscribe header (RFC 8058).
//
// When a client presses "Unsubscribe" next to the sender's name in Gmail,
// Outlook or Apple Mail, the mail provider sends a POST here with the body
// "List-Unsubscribe=One-Click". Only that POST unsubscribes. A GET, which is
// all a link-following mail scanner sends, goes to the ordinary unsubscribe
// page, where a button still has to be pressed.

export async function POST(request: NextRequest) {
    const token = new URL(request.url).searchParams.get("token");
    if (!isUnsubscribeToken(token)) {
        return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const body = await request.text().catch(() => "");
    if (!/List-Unsubscribe\s*=\s*One-Click/i.test(body)) {
        return NextResponse.json({ error: "Not a one-click unsubscribe request" }, { status: 400 });
    }

    try {
        const email = await unsubscribeByToken(token);
        if (email === null) {
            return NextResponse.json({ error: "Invalid or expired unsubscribe link" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("One-click unsubscribe error:", error);
        return NextResponse.json({ error: "Failed to process unsubscribe request" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const target = `https://hunters-hounds.london/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
    return NextResponse.redirect(target, 302);
}
