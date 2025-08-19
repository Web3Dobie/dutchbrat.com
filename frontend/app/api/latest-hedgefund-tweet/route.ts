// frontend/app/api/latest-hedgefund-tweet/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// Helper function to extract title from Notion title property
function getTitle(titleProperty: any): string {
  if (!titleProperty || !titleProperty.title) return '';
  return titleProperty.title.map((item: any) => item.plain_text || '').join('');
}

// Helper function to extract select property value
function getSelectValue(selectProperty: any): string {
  if (!selectProperty || !selectProperty.select) return '';
  return selectProperty.select.name || '';
}

// Helper function to extract URL property value
function getUrlValue(urlProperty: any): string {
  if (!urlProperty || !urlProperty.url) return '';
  return urlProperty.url;
}

// Helper function to extract date property value
function getDateValue(dateProperty: any): string {
  if (!dateProperty || !dateProperty.date) return '';
  return dateProperty.date.start || '';
}

// Helper function to extract rich text OR plain text
function getTextContent(textProperty: any): string {
  // Handle Rich Text property
  if (textProperty && textProperty.rich_text) {
    return textProperty.rich_text.map((item: any) => item.plain_text || '').join('');
  }
  
  // Handle plain Text property  
  if (textProperty && typeof textProperty === 'string') {
    return textProperty;
  }
  
  // Handle other text formats
  if (textProperty && textProperty.plain_text) {
    return textProperty.plain_text;
  }
  
  return '';
}

export async function GET(req: NextRequest) {
  try {
    const databaseId = process.env.HEDGEFUND_TWEET_DB_ID!
    
    if (!databaseId) {
      throw new Error('HEDGEFUND_TWEET_DB_ID environment variable not set')
    }

    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'Date',
          direction: 'descending',
        },
      ],
      page_size: 1, // We only want the latest tweet
      filter: {
        and: [
          {
            property: 'URL',
            url: {
              is_not_empty: true,
            },
          },
          {
            property: 'Type',
            select: {
              does_not_equal: 'reply', // Exclude replies
            },
          },
        ],
      },
    })

    if (!response.results || response.results.length === 0) {
      return NextResponse.json(
        { error: 'No hedge fund tweets found' },
        { status: 404 }
      )
    }

    // Transform the latest tweet to our format
    const latestPage = response.results[0] as any
    const properties = latestPage.properties

    const tweet = {
      id: getTitle(properties['Tweet ID']) || latestPage.id,
      text: getTextContent(properties['Text']) || `Latest ${getSelectValue(properties['Type'])} from HedgeFund Agent`,
      created_at: getDateValue(properties['Date']) || latestPage.created_time,
      public_metrics: {
        like_count: properties['Likes']?.number || 0,
        retweet_count: properties['Retweets']?.number || 0,
        reply_count: properties['Replies']?.number || 0,
      },
      url: getUrlValue(properties['URL']) || '',
      type: getSelectValue(properties['Type']) || 'hedge_fund_commentary',
      engagement_score: properties['Engagement Score']?.number || 0
    }

    console.log(`Returning latest hedge fund tweet: ${tweet.id}`)
    
    return NextResponse.json({
      user: {
        id: 'hedgefund_agent',
        username: 'HedgeFund_Agent',
        name: 'HedgeFund Agent'
      },
      tweet: tweet,
      source: 'hedgefund_notion'
    })
  } catch (err: any) {
    console.error('Error fetching latest hedge fund tweet:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}