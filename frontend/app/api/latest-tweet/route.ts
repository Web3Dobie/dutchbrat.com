// app/api/latest-tweet/route.ts
import { fetchTwitterData } from '../../../lib/twitterApi';
import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

interface TwitterResponse {
  user: TwitterUser;
  tweets: TwitterTweet[];
}

// Fallback data when Twitter API is unavailable
const fallbackResponse: TwitterResponse = {
  user: {
    id: "fallback",
    username: process.env.TWITTER_USERNAME || "dutchbrat",
    name: "DutchBrat"
  },
  tweets: [{
    id: "fallback_1",
    text: "Twitter API temporarily unavailable due to rate limits. Latest tweets will be available soon.",
    created_at: new Date().toISOString(),
    public_metrics: {
      like_count: 0,
      retweet_count: 0,
      reply_count: 0
    }
  }]
};

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || process.env.TWITTER_USERNAME;
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    // Get user ID first (this is cached)
    const userResponse = await fetchTwitterData('users/by/username/' + username);
    
    if (!userResponse.data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const userId: string = userResponse.data.id;
    
    // Get recent tweets (this is also cached)
    const tweetsResponse = await fetchTwitterData(`users/${userId}/tweets`, {
      'max_results': '10',
      'tweet.fields': 'created_at,public_metrics,text',
      'exclude': 'retweets,replies'
    });
    
    const response: TwitterResponse = {
      user: userResponse.data,
      tweets: tweetsResponse.data || []
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Twitter API route error:', error);
    
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      console.log('Rate limit exceeded, returning fallback data');
      // Return fallback data instead of error
      return NextResponse.json(fallbackResponse, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Twitter-Status': 'rate-limited'
        }
      });
    }
    
    // For other errors, return fallback data too
    console.log('Twitter API error, returning fallback data');
    return NextResponse.json(fallbackResponse, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Twitter-Status': 'error'
      }
    });
  }
}