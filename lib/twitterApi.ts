// lib/twitterApi.ts
import rateLimiter from './twitterRateLimiter';

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface TwitterParams {
  [key: string]: string | number;
}

class TwitterCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTimeout: number = 15 * 60 * 1000; // 15 minutes cache (increased from 5)

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

const cache = new TwitterCache();

export async function fetchTwitterData(endpoint: string, params: TwitterParams = {}): Promise<any> {
  const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Returning cached Twitter data');
    return cached;
  }
  
  // Wait for rate limit if needed
  await rateLimiter.waitIfNeeded();
  
  try {
    const url = new URL(`https://api.twitter.com/2/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the successful response
    cache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('Twitter API error:', error);
    throw error;
  }
}