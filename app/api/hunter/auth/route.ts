// app/api/hunter/auth/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { verifyFamilyAuth } from '../../../../lib/hunterMedia'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    
    const isValid = await verifyFamilyAuth(username, password)
    
    if (isValid) {
      const response = NextResponse.json({ success: true })
      // Set a simple session cookie (enhance with JWT later if needed)
      response.cookies.set('hunter-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
      return response
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}