// app/api/hunter/auth/check/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const authCookie = req.cookies.get('hunter-auth')
  const isAuthenticated = authCookie?.value === 'authenticated'
  
  return NextResponse.json({ authenticated: isAuthenticated })
}
