// lib/database.ts - Centralized database connection pool
import { Pool, PoolConfig } from 'pg';
import { config } from './config';

/**
 * Singleton database pool instance
 * This ensures only one pool is created across the entire application
 */
let pool: Pool | null = null;

/**
 * Get or create the shared database connection pool
 *
 * Benefits:
 * - Single pool instance shared across all API routes
 * - Prevents connection exhaustion under load
 * - Reduces memory footprint
 * - Easier to monitor and debug
 *
 * @returns Shared Pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    const poolConfig: PoolConfig = {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      // Connection pool settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection not available
    };

    pool = new Pool(poolConfig);

    // Log pool events for debugging
    pool.on('connect', () => {
      console.log('📊 Database pool: New client connected');
    });

    pool.on('error', (err) => {
      console.error('❌ Database pool: Unexpected error on idle client', err);
    });

    console.log('✅ Database pool created:', {
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
      user: poolConfig.user,
      max: poolConfig.max,
    });
  }

  return pool;
}

/**
 * Close the database pool
 * Useful for graceful shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database pool closed');
  }
}

/**
 * Get current pool statistics
 * Useful for monitoring and debugging
 */
export function getPoolStats() {
  if (!pool) {
    return null;
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
