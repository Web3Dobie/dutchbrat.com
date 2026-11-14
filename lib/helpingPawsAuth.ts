import { NextRequest, NextResponse } from 'next/server';
import {
    HELPING_PAWS_COOKIE,
    SESSION_COOKIE_OPTIONS,
    SESSION_TTL_SECONDS,
    signSession,
    verifySession,
} from './session';

// Helping Paws participant sessions.
//
// Until 2026-10-31 the cookie's value WAS the participant id, accepted if
// parseInt() produced a number — so `helping-paws-auth=5` logged you in as
// participant 5, and '5abc' worked too. It is now an HMAC-signed token carrying
// the id, in its own realm so it cannot be swapped for an admin or customer one.
//
// The function signatures are unchanged, so the three routes using this module
// needed no edits.

export function isParticipantAuthenticated(req: NextRequest): boolean {
    return getParticipantId(req) !== null;
}

export function getParticipantId(req: NextRequest): number | null {
    const payload = verifySession(req.cookies.get(HELPING_PAWS_COOKIE)?.value, 'helping-paws');
    if (!payload || typeof payload.participant_id !== 'number') return null;
    return payload.participant_id;
}

export function participantUnauthorizedResponse(): NextResponse {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export function setParticipantCookie(response: NextResponse, participantId: number): void {
    const token = signSession(
        { realm: 'helping-paws', participant_id: participantId },
        SESSION_TTL_SECONDS
    );
    response.cookies.set(HELPING_PAWS_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

export function clearParticipantCookie(response: NextResponse): void {
    response.cookies.set(HELPING_PAWS_COOKIE, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}
