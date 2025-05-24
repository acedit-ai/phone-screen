/**
 * Simple Database Utility for Rate Limiting
 * 
 * Lightweight database layer using NeonDB serverless driver
 * for persistent rate limiting tracking across deployments.
 */

import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  // In development mode, rate limiting is disabled, so DATABASE_URL is optional
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('DATABASE_URL environment variable is not set');
  }
}

// Create the database connection (only if DATABASE_URL exists)
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

/**
 * Initialize the database schema for rate limiting
 * Creates tables if they don't exist
 */
export async function initializeDatabase() {
  if (!sql) {
    console.log('🔧 Development mode: DATABASE_URL not set, skipping database initialization');
    return;
  }

  try {
    // Create rate_limits table for tracking request counts
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        window_start BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create index for efficient lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_id ON rate_limits(id)
    `;

    // Create index for cleanup operations
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start)
    `;

    console.log('✅ Rate limiting database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Get or create a rate limit entry
 */
export async function getRateLimit(key: string, windowMs: number) {
  if (!sql) {
    throw new Error('Database not available in development mode');
  }

  const now = Date.now();
  const windowStart = now - (now % windowMs); // Align to window boundary

  try {
    // First, try to get existing entry
    const existing = await sql`
      SELECT count, window_start 
      FROM rate_limits 
      WHERE id = ${key}
    `;

    if (existing.length > 0) {
      const entry = existing[0];
      
      // Check if we're in the same window
      if (entry.window_start === windowStart) {
        return {
          count: entry.count,
          windowStart: entry.window_start
        };
      }
      
      // New window, reset the count
      await sql`
        UPDATE rate_limits 
        SET count = 0, window_start = ${windowStart}, updated_at = NOW()
        WHERE id = ${key}
      `;
      
      return {
        count: 0,
        windowStart
      };
    }

    // Create new entry
    await sql`
      INSERT INTO rate_limits (id, count, window_start)
      VALUES (${key}, 0, ${windowStart})
    `;

    return {
      count: 0,
      windowStart
    };
  } catch (error) {
    console.error('❌ Failed to get rate limit:', error);
    throw error;
  }
}

/**
 * Increment the rate limit counter
 */
export async function incrementRateLimit(key: string): Promise<number> {
  if (!sql) {
    throw new Error('Database not available in development mode');
  }

  try {
    const result = await sql`
      UPDATE rate_limits 
      SET count = count + 1, updated_at = NOW()
      WHERE id = ${key}
      RETURNING count
    `;

    return result[0]?.count || 0;
  } catch (error) {
    console.error('❌ Failed to increment rate limit:', error);
    throw error;
  }
}

/**
 * Clean up old rate limit entries to prevent table bloat
 * Removes entries older than the specified retention period
 */
export async function cleanupOldRateLimits(retentionHours = 24) {
  if (!sql) {
    console.log('🔧 Development mode: DATABASE_URL not set, skipping cleanup');
    return 0;
  }

  try {
    const cutoffTime = Date.now() - (retentionHours * 60 * 60 * 1000);
    
    const result = await sql`
      DELETE FROM rate_limits 
      WHERE window_start < ${cutoffTime}
    `;

    console.log(`🧹 Cleaned up ${result.length} old rate limit entries`);
    return result.length;
  } catch (error) {
    console.error('❌ Failed to cleanup old rate limits:', error);
    throw error;
  }
}

/**
 * Reset rate limits for a specific key (for testing/admin purposes)
 */
export async function resetRateLimit(key: string) {
  if (!sql) {
    console.log('🔧 Development mode: DATABASE_URL not set, skipping rate limit reset');
    return;
  }

  try {
    await sql`
      DELETE FROM rate_limits 
      WHERE id = ${key}
    `;
    
    console.log(`🔄 Reset rate limit for key: ${key}`);
  } catch (error) {
    console.error('❌ Failed to reset rate limit:', error);
    throw error;
  }
}

/**
 * Get rate limiting statistics
 */
export async function getRateLimitStats() {
  if (!sql) {
    console.log('🔧 Development mode: DATABASE_URL not set, returning mock stats');
    return {
      total_entries: 0,
      total_requests: 0,
      avg_requests_per_key: 0,
      max_requests_per_key: 0
    };
  }

  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_entries,
        SUM(count) as total_requests,
        AVG(count) as avg_requests_per_key,
        MAX(count) as max_requests_per_key
      FROM rate_limits
    `;

    return stats[0] || {
      total_entries: 0,
      total_requests: 0,
      avg_requests_per_key: 0,
      max_requests_per_key: 0
    };
  } catch (error) {
    console.error('❌ Failed to get rate limit stats:', error);
    throw error;
  }
} 