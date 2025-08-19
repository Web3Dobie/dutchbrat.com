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

    // Enhanced query strategy: Get more records to allow for intelligent filtering
    const response = await notion.databases.query({
      database_id: NOTION_TWEET_LOG_DB,
      sorts: [
        {
          property: 'Date',
          direction: 'descending',
        },
      ],
      page_size: 20, // Get more records for better filtering options
      filter: {
        and: [
          {
            property: 'URL',
            url: {
              is_not_empty: true,
            },
          },
          // Remove the Type filter here - we'll handle filtering in code for more control
        ],
      },
    });

    if (!response.results || response.results.length === 0) {
      return NextResponse.json(
        { error: 'No tweets found in Notion database' },
        { status: 404 }
      );
    }

    // Map and filter Notion data with enhanced logic
    const allTweets: (NotionTweetResponse & { type: string; priority: number })[] = response.results
      .map((page: any) => {
        const properties = page.properties;

        // Extract data from Notion properties
        const tweetId = properties['Tweet ID']?.title?.[0]?.text?.content || page.id;
        const date = properties['Date']?.date?.start || page.created_time;
        const url = properties['URL']?.url || `https://x.com/Web3_Dobie/status/${tweetId}`;
        const likes = properties['Likes']?.number || 0;
        const retweets = properties['Retweets']?.number || 0;
        const replies = properties['Replies']?.number || 0;
        const type = properties['Type']?.select?.name || 'tweet';

        // ENHANCED: Fix text extraction from Notion
        let text = '';
        
        // Try multiple ways to extract text content
        if (properties['Text']) {
          if (properties['Text'].rich_text && Array.isArray(properties['Text'].rich_text)) {
            // Extract from rich_text array
            text = properties['Text'].rich_text
              .map((item: any) => item.plain_text || item.text?.content || '')
              .join('');
          } else if (properties['Text'].plain_text) {
            // Direct plain_text access
            text = properties['Text'].plain_text;
          }
        }

        // Fallback if no text found - but make it more descriptive
        if (!text || text.trim() === '') {
          text = `Latest ${type === 'thread-reply' ? 'thread update' : type} from @Web3_Dobie`;
        }

        // ENHANCED: Assign priority for intelligent filtering
        let priority = 0;
        switch (type) {
          case 'tweet':
            priority = 100; // Highest priority - standalone tweets
            break;
          case 'thread':
            priority = 90; // High priority - thread starters
            break;
          case 'quote':
            priority = 80; // Medium-high priority - quote tweets
            break;
          case 'thread-reply':
            priority = 20; // Lower priority - thread replies
            break;
          case 'reply':
            priority = 10; // Lowest priority - regular replies
            break;
          default:
            priority = 50; // Default priority for unknown types
        }

        return {
          id: tweetId,
          text: text.trim(),
          created_at: new Date(date).toISOString(),
          public_metrics: {
            like_count: likes,
            retweet_count: retweets,
            reply_count: replies,
          },
          url: url,
          type: type,
          priority: priority,
        };
      })
      .filter((tweet) => {
        // Filter out entries without meaningful content
        return tweet.text && tweet.text.trim() !== '' && tweet.url;
      });

    if (allTweets.length === 0) {
      return NextResponse.json(
        { error: 'No valid tweets found in Notion database' },
        { status: 404 }
      );
    }

    // ENHANCED: Smart selection algorithm
    let selectedTweet: (NotionTweetResponse & { type: string; priority: number }) | null = null;

    // Strategy 1: Try to find the most recent high-priority tweet (tweet or thread)
    const highPriorityTweets = allTweets.filter(tweet => tweet.priority >= 80);
    if (highPriorityTweets.length > 0) {
      selectedTweet = highPriorityTweets[0]; // Already sorted by date
      console.log(`✅ Selected high-priority ${selectedTweet.type}: ${selectedTweet.text.substring(0, 50)}...`);
    }

    // Strategy 2: If no high-priority tweets, get the most recent valid tweet
    if (!selectedTweet) {
      selectedTweet = allTweets[0];
      console.log(`✅ Selected most recent ${selectedTweet.type}: ${selectedTweet.text.substring(0, 50)}...`);
    }

    // Additional safety check
    if (!selectedTweet) {
      return NextResponse.json(
        { error: 'No suitable tweet found after filtering' },
        { status: 404 }
      );
    }

    // Remove the priority and type fields before sending response
    const { priority, type, ...tweetResponse } = selectedTweet;

    const apiResponse: ApiResponse = {
      user: {
        id: process.env.X_BOT_USER_ID || "notion-fallback",
        username: process.env.TWITTER_USERNAME || "Web3_Dobie",
        name: "Web3 Dobie"
      },
      tweets: [tweetResponse],
      source: 'notion'
    };

    console.log(`📊 Processed ${allTweets.length} tweets, selected: ${type} with priority ${priority}`);

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