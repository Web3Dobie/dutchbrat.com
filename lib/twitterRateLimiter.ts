// lib/twitterRateLimiter.ts
interface RateLimitResult {
  canProceed: boolean;
  waitTime: number;
}

class TwitterRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number = 75; // Conservative limit for user timeline
  private readonly windowMs: number = 15 * 60 * 1000; // 15 minutes

  async canMakeRequest(): Promise<RateLimitResult> {
    const now = Date.now();
    
    // Remove requests older than the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we can make another request
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      return { canProceed: false, waitTime };
    }
    
    // Record this request
    this.requests.push(now);
    return { canProceed: true, waitTime: 0 };
  }

  async waitIfNeeded(): Promise<boolean> {
    const { canProceed, waitTime } = await this.canMakeRequest();
    
    if (!canProceed) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitIfNeeded(); // Recursive check
    }
    
    return true;
  }
}

// Singleton instance
const rateLimiter = new TwitterRateLimiter();

export default rateLimiter;