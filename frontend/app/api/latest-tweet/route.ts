// app/api/latest-tweet-notion/route.ts
import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface NotionTweetResponse {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
  url: string;
}

interface ApiResponse {
  user: {
    id: string;
    username: string;
    name: string;
  };
  tweets: NotionTweetResponse[];
  source: 'notion';
}

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const NOTION_TWEET_LOG_DB = process.env.NOTION_TWEET_LOG_DB;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    if (!NOTION_TWEET_LOG_DB) {
      console.error('NOTION_TWEET_LOG_DB environment variable not set');
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Query Notion database for the latest tweets
    // Sort by Date (descending) to get the most recent first
    const response = await notion.databases.query({
      database_id: NOTION_TWEET_LOG_DB,
      sorts: [
        {
          property: 'Date',
          direction: 'descending',
        },
      ],
      page_size: 5, // Get last 5 tweets, we'll use the first one
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
              does_not_equal: 'reply', // Exclude replies if you want main tweets only
            },
          },
        ],
      },
    });

    if (!response.results || response.results.length === 0) {
      return NextResponse.json(
        { error: 'No tweets found in Notion database' },
        { status: 404 }
      );
    }

    // Map Notion data to Twitter-like format
    const tweets: NotionTweetResponse[] = response.results.map((page: any) => {
      const properties = page.properties;

      // Extract data from Notion properties
      const tweetId = properties['Tweet ID']?.title?.[0]?.text?.content || page.id;
      const date = properties['Date']?.date?.start || page.created_time;
      const url = properties['URL']?.url || `https://x.com/Web3_Dobie/status/${tweetId}`;
      const likes = properties['Likes']?.number || 0;
      const retweets = properties['Retweets']?.number || 0;
      const replies = properties['Replies']?.number || 0;
      const type = properties['Type']?.select?.name || 'tweet';

      // For text, we'll need to construct it or store it separately
      // Since you might not store the full text in Notion, we'll create a placeholder
      // You might want to add a "Text" field to your Notion database for this
      const text = properties['Text']?.plain_text?.[0]?.text?.content ||
        `Latest ${type} from @Web3_Dobie`;

      return {
        id: tweetId,
        text: text,
        created_at: new Date(date).toISOString(),
        public_metrics: {
          like_count: likes,
          retweet_count: retweets,
          reply_count: replies,
        },
        url: url,
      };
    });

    const apiResponse: ApiResponse = {
      user: {
        id: process.env.X_BOT_USER_ID || "notion-fallback",
        username: process.env.TWITTER_USERNAME || "Web3_Dobie",
        name: "Web3 Dobie"
      },
      tweets: tweets,
      source: 'notion'
    };

    return NextResponse.json(apiResponse, {
      headers: {
        'Cache-Control': 'public, s-maxage=300', // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('Notion API route error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch tweets from Notion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}