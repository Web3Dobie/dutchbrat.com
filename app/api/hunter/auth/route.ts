// app/api/hunter/auth/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminCredentials } from '@/lib/auth'
import { HUNTER_COOKIE, SESSION_COOKIE_OPTIONS, SESSION_TTL_SECONDS, signSession } from '@/lib/session'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'

// 10 attempts per 15 minutes per IP.
const MAX_ATTEMPTS = 10
const WINDOW_SECONDS = 15 * 60

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const limit = rateLimit(`hunter-auth:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS)
    if (!limit.allowed) {
      console.warn(`[Hunter Auth] Rate limit hit from ${ip}`)
      return tooManyRequests(limit.retryAfter)
    }

    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Shares the dog-walking admin credentials, as verifyFamilyAuth always did,
    // but now via one constant-time implementation.
    const matchedUser = verifyAdminCredentials(username, password)

    if (!matchedUser) {
      console.warn(`[Hunter Auth] Failed login for '${username}' from ${ip}`)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Signed token, realm-scoped to 'hunter': a dog-walking admin cookie will not
    // satisfy this area and vice versa.
    const token = signSession({ realm: 'hunter', username: matchedUser }, SESSION_TTL_SECONDS)

    const response = NextResponse.json({ success: true })
    response.cookies.set(HUNTER_COOKIE, token, SESSION_COOKIE_OPTIONS)
    console.log(`[Hunter Auth] Session issued for '${matchedUser}' from ${ip}`)
    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
