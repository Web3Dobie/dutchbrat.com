// frontend/lib/tweetHelpers.ts
import { Client } from '@notionhq/client'
import { NextResponse } from 'next/server'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// Types for better type safety
interface TweetData {
  id: string
  text: string
  created_at: string
  public_metrics: {
    like_count: number
    retweet_count: number
    reply_count: number
  }
  url: string
  type: string
  engagement_score: number
}

interface UserData {
  id: string
  username: string
  name: string
}

interface TweetResponse {
  user: UserData
  tweets: TweetData[]  // Changed from tweet to tweets (array)
  source: string
}

interface TweetSourceConfig {
  databaseId: string
  user: UserData
  source: string
  fallbackText?: string
}

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

// Enhanced helper function to extract text content from any Notion text property
function getTextContent(textProperty: any): string {
  // Handle null/undefined
  if (!textProperty) return '';
  
  // Handle Rich Text property (array of rich text objects)
  if (textProperty.rich_text && Array.isArray(textProperty.rich_text)) {
    return textProperty.rich_text.map((item: any) => item.plain_text || '').join('');
  }
  
  // Handle plain Text property (direct string value)
  if (textProperty.plain_text && typeof textProperty.plain_text === 'string') {
    return textProperty.plain_text;
  }
  
  // Handle direct string (fallback)
  if (typeof textProperty === 'string') {
    return textProperty;
  }
  
  // Handle case where the text is stored directly in the property object
  if (textProperty.text && typeof textProperty.text === 'string') {
    return textProperty.text;
  }
  
  // Handle edge case where text might be in a different structure
  if (textProperty.content && typeof textProperty.content === 'string') {
    return textProperty.content;
  }
  
  // Log the structure for debugging if needed (but don't fail)
  console.warn('Unexpected text property structure:', JSON.stringify(textProperty, null, 2));
  
  return '';
}

// Core shared function to fetch latest tweet from any Notion database
export async function fetchLatestTweetFromNotion(config: TweetSourceConfig): Promise<NextResponse> {
  try {
    if (!config.databaseId) {
      throw new Error(`Database ID not provided for ${config.source}`)
    }

    const response = await notion.databases.query({
      database_id: config.databaseId,
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
        { error: `No tweets found in ${config.source} database` },
        { status: 404 }
      )
    }

    // Transform the latest tweet to our format
    const latestPage = response.results[0] as any
    const properties = latestPage.properties

    // Extract text with enhanced function and provide fallback
    const tweetText = getTextContent(properties['Text']) || 
                     config.fallbackText ||
                     `Latest ${getSelectValue(properties['Type'])} from ${config.user.name}`

    const tweet: TweetData = {
      id: getTitle(properties['Tweet ID']) || latestPage.id,
      text: tweetText,
      created_at: getDateValue(properties['Date']) || latestPage.created_time,
      public_metrics: {
        like_count: properties['Likes']?.number || 0,
        retweet_count: properties['Retweets']?.number || 0,
        reply_count: properties['Replies']?.number || 0,
      },
      url: getUrlValue(properties['URL']) || '',
      type: getSelectValue(properties['Type']) || 'tweet',
      engagement_score: properties['Engagement Score']?.number || 0
    }

    console.log(`Returning latest ${config.source} tweet: ${tweet.id} with text: "${tweet.text.substring(0, 50)}..."`)
    
    const responseData: TweetResponse = {
      user: config.user,
      tweets: [tweet],  // Wrap in array to match existing component expectations
      source: config.source
    }

    return NextResponse.json(responseData)
  } catch (err: any) {
    console.error(`Error fetching latest ${config.source} tweet:`, err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}