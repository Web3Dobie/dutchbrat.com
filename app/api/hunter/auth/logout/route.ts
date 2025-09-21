// app/api/hunter/auth/logout/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('hunter-auth')
  return response
}