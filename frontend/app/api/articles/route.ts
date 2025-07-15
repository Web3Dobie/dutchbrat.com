export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

export async function GET(req: NextRequest) {
  try {
    const databaseId = process.env.NOTION_DB_ID!
    const response = await notion.databases.query({
      database_id: databaseId,
    })
    return NextResponse.json(response.results)
  } catch (err: any) {
    console.error('Error fetching articles:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
