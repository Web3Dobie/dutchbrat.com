// app/api/hunter/auth/check/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { isHunterAuthenticated } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const isAuthenticated = isHunterAuthenticated(req)
  
  return NextResponse.json({ authenticated: isAuthenticated })
}
