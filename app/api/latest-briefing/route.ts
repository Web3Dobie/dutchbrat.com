// File: frontend/app/api/latest-briefing/route.ts
// Create this new API route following your existing pattern

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Use internal Docker networking to call htd-agent
    const url = 'http://htd-agent:3002/latest-briefing';
    
    console.log(`[Latest Briefing API] Fetching from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[Latest Briefing API] HTD Agent returned ${response.status}: ${response.statusText}`);
      return NextResponse.json(
        { 
          success: false, 
          error: `HTD Agent service error: ${response.status}`,
          fallback: true 
        }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Latest Briefing API] Success:`, data.briefing?.title || 'Unknown briefing');

    // Add CORS headers for frontend access
    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[Latest Briefing API] Error:', error);
    
    // Return fallback data structure
    const fallbackResponse = {
      success: false,
      briefing: null,
      sentiment: {
        sentiment: "unknown",
        emoji: "🔄", 
        color: "#6b7280",
        description: "Market analysis loading"
      },
      momentum: {
        bullish_percentage: 50,
        bearish_percentage: 50,
        neutral_percentage: 0,
        momentum_direction: "neutral"
      },
      sectors: [],
      insights: ["Market analysis in progress"],
      summary: "Latest briefing data temporarily unavailable.",
      confidence: "moderate",
      health_score: 50,
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return NextResponse.json(fallbackResponse, { 
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}