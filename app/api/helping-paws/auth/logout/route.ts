import { NextRequest, NextResponse } from 'next/server';
import { clearParticipantCookie } from '@/lib/helpingPawsAuth';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
    const response = NextResponse.json({ ok: true });
    clearParticipantCookie(response);
    return response;
}
