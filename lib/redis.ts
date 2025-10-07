// lib/redis.ts
import Redis from 'ioredis';

export interface BriefingData {
  id: string;
  title: string;
  period: string;
  date: string;
  pageUrl: string;
  tweetUrl: string;
  marketSentiment: string;
  content: any[];
}

export class RedisService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis({
      host: 'redis',
      port: 6379,
      // Remove lazyConnect: true
      retryStrategy: (times) => {
        // Retry connection with exponential backoff
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
      this.isConnected = true;
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Check if Redis is available
   */
  public isAvailable(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  /**
   * Ensure connection with retry logic
   */
  private async ensureConnection(retries: number = 3): Promise<boolean> {
    if (this.isAvailable()) {
      return true;
    }

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Attempting Redis connection (attempt ${i + 1}/${retries})`);
        await this.redis.connect();

        if (this.isAvailable()) {
          console.log('✅ Redis connection established');
          return true;
        }
      } catch (error) {
        console.error(`❌ Redis connection attempt ${i + 1} failed:`, error);

        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    console.error('❌ Failed to establish Redis connection after all attempts');
    return false;
  }

  /**
   * Get cached briefing by database ID
   */
  async getBriefing(briefingId: number): Promise<BriefingData | null> {
    if (!this.isAvailable()) {
      console.log('⚠️ Redis unavailable for getBriefing');
      return null;
    }

    try {
      const key = `briefing:content:${briefingId}`;
      const cached = await this.redis.get(key);

      if (cached) {
        console.log(`✅ Redis cache HIT for briefing ${briefingId}`);
        return JSON.parse(cached);
      }

      console.log(`❌ Redis cache MISS for briefing ${briefingId}`);
      return null;
    } catch (error) {
      console.error(`Redis getBriefing error for ${briefingId}:`, error);
      return null;
    }
  }

  /**
   * Get cached briefing by Notion page ID
   */
  async getBriefingByNotionId(notionPageId: string): Promise<BriefingData | null> {
    if (!this.isAvailable()) {
      console.log('⚠️ Redis unavailable for getBriefingByNotionId');
      return null;
    }

    try {
      // First get the database ID mapping
      const mappingKey = `briefing:notion:${notionPageId}`;
      const briefingId = await this.redis.get(mappingKey);

      if (!briefingId) {
        console.log(`❌ No mapping found for Notion ID ${notionPageId}`);
        return null;
      }

      // Then get the actual briefing data
      return await this.getBriefing(parseInt(briefingId));
    } catch (error) {
      console.error(`Redis getBriefingByNotionId error for ${notionPageId}:`, error);
      return null;
    }
  }

  /**
   * Cache briefing data with TTL
   */
  async setBriefing(briefingId: number, notionPageId: string, data: BriefingData): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('⚠️ Redis unavailable for setBriefing');
      return false;
    }

    try {
      const TTL_HOURS = 6;
      const TTL_SECONDS = TTL_HOURS * 60 * 60;

      // Cache the briefing content
      const contentKey = `briefing:content:${briefingId}`;
      await this.redis.setex(contentKey, TTL_SECONDS, JSON.stringify(data));

      // Cache the notion ID mapping (longer TTL since this rarely changes)
      const mappingKey = `briefing:notion:${notionPageId}`;
      await this.redis.setex(mappingKey, TTL_SECONDS * 4, briefingId.toString());

      console.log(`✅ Cached briefing ${briefingId} (Notion: ${notionPageId}) with ${TTL_HOURS}h TTL`);
      return true;
    } catch (error) {
      console.error(`Redis setBriefing error for ${briefingId}:`, error);
      return false;
    }
  }

  /**
   * Cache briefings list with shorter TTL
   */
  async setBriefingsList(briefings: BriefingData[], cursor?: string): Promise<boolean> {
    try {
      // Try to ensure connection first
      const connected = await this.ensureConnection();
      if (!connected) {
        console.log('⚠️ Redis unavailable for setBriefingsList - connection failed');
        return false;
      }

      const TTL_MINUTES = 30; // Shorter TTL for list view
      const TTL_SECONDS = TTL_MINUTES * 60;

      const key = cursor ? `briefings:list:${cursor}` : 'briefings:list:latest';
      await this.redis.setex(key, TTL_SECONDS, JSON.stringify(briefings));

      console.log(`✅ Cached briefings list (${briefings.length} items) with ${TTL_MINUTES}m TTL`);
      return true;
    } catch (error) {
      console.error('Redis setBriefingsList error:', error);
      return false;
    }
  }

  /**
   * Get cached briefings list
   */
  async getBriefingsList(cursor?: string): Promise<BriefingData[] | null> {
    try {
      // Try to ensure connection first
      const connected = await this.ensureConnection();
      if (!connected) {
        console.log('⚠️ Redis unavailable for getBriefingsList - connection failed');
        return null;
      }

      const key = cursor ? `briefings:list:${cursor}` : 'briefings:list:latest';
      const cached = await this.redis.get(key);

      if (cached) {
        const briefings = JSON.parse(cached);
        console.log(`✅ Redis cache HIT for briefings list (${briefings.length} items)`);
        return briefings;
      }

      console.log('❌ Redis cache MISS for briefings list');
      return null;
    } catch (error) {
      console.error('Redis getBriefingsList error:', error);
      return null;
    }
  }

  /**
   * Generic get from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log(`⚠️ Redis unavailable for get: ${key}`);
      return null;
    }

    try {
      const value = await this.redis.get(key);
      return value;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic setex (set with expiration) to Redis
   */
  async setex(key: string, ttlSeconds: number, value: string): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log(`⚠️ Redis unavailable for setex: ${key}`);
      return false;
    }

    try {
      await this.redis.setex(key, ttlSeconds, value);
      console.log(`✅ Cached ${key} with ${ttlSeconds}s TTL`);
      return true;
    } catch (error) {
      console.error(`Redis setex error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Lock mechanism to prevent concurrent Notion fetches
   */
  async acquireLock(briefingId: number, timeoutMs: number = 30000): Promise<boolean> {
    if (!this.isAvailable()) {
      return false; // No lock acquired, proceed anyway
    }

    try {
      const lockKey = `briefing:building:${briefingId}`;
      const lockValue = Date.now().toString();
      const TTL_SECONDS = Math.ceil(timeoutMs / 1000);

      // Set lock only if it doesn't exist (NX option)
      const result = await this.redis.set(lockKey, lockValue, 'EX', TTL_SECONDS, 'NX');

      if (result === 'OK') {
        console.log(`🔒 Acquired lock for briefing ${briefingId}`);
        return true;
      }

      console.log(`⏳ Lock already exists for briefing ${briefingId}`);
      return false;
    } catch (error) {
      console.error(`Redis lock error for ${briefingId}:`, error);
      return false; // Proceed without lock on error
    }
  }

  /**
   * Release lock
   */
  async releaseLock(briefingId: number): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const lockKey = `briefing:building:${briefingId}`;
      await this.redis.del(lockKey);
      console.log(`🔓 Released lock for briefing ${briefingId}`);
    } catch (error) {
      console.error(`Redis unlock error for ${briefingId}:`, error);
    }
  }

  /**
   * Wait for another process to finish building the briefing
   */
  async waitForBriefing(briefingId: number, maxWaitMs: number = 25000): Promise<BriefingData | null> {
    const startTime = Date.now();
    const checkIntervalMs = 500; // Check every 500ms

    while (Date.now() - startTime < maxWaitMs) {
      const briefing = await this.getBriefing(briefingId);
      if (briefing) {
        console.log(`✅ Found briefing ${briefingId} after waiting ${Date.now() - startTime}ms`);
        return briefing;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }

    console.log(`⏱️ Timeout waiting for briefing ${briefingId} after ${maxWaitMs}ms`);
    return null;
  }

  /**
   * Invalidate specific briefing cache
   */
  async invalidateBriefing(briefingId: number, notionPageId?: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const keys = [`briefing:content:${briefingId}`];

      if (notionPageId) {
        keys.push(`briefing:notion:${notionPageId}`);
      }

      await this.redis.del(...keys);
      console.log(`🗑️ Invalidated cache for briefing ${briefingId}`);
    } catch (error) {
      console.error(`Redis invalidation error for ${briefingId}:`, error);
    }
  }

  /**
   * Get Redis status for health checks
   */
  async getStatus(): Promise<{
    connected: boolean;
    status: string;
    memory?: any;
    keyCount?: number;
  }> {
    try {
      if (!this.isAvailable()) {
        return { connected: false, status: 'disconnected' };
      }

      // Get basic info
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();

      return {
        connected: true,
        status: 'healthy',
        memory: this.parseRedisInfo(info),
        keyCount
      };
    } catch (error) {
      return {
        connected: false,
        status: 'error',
      };
    }
  }

  /**
   * Parse Redis INFO output
   */
  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};

    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      console.log('🔌 Redis connection closed');
    }
  }
}

// Singleton instance
let redisInstance: RedisService | null = null;

export function getRedisService(): RedisService {
  if (!redisInstance) {
    redisInstance = new RedisService();
  }
  return redisInstance;
}