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
        region TEXT,
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

    // Create index for region-based queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_region ON rate_limits(region)
    `;

    // Add region column if it doesn't exist (for existing installations)
    await sql`
      ALTER TABLE rate_limits 
      ADD COLUMN IF NOT EXISTS region TEXT
    `.catch(() => {
      // Ignore error if column already exists (some DB versions handle this differently)
      console.log('📝 Region column may already exist or alter table not supported');
    });

    console.log('✅ Rate limiting database schema initialized with region tracking');
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
      SELECT count, window_start, region
      FROM rate_limits 
      WHERE id = ${key}
    `;

    if (existing.length > 0) {
      const entry = existing[0];
      
      // Check if we're in the same window
      if (entry.window_start === windowStart) {
        return {
          count: entry.count,
          windowStart: entry.window_start,
          region: entry.region
        };
      }
      
      // New window, reset the count (keep the region)
      await sql`
        UPDATE rate_limits 
        SET count = 0, window_start = ${windowStart}, updated_at = NOW()
        WHERE id = ${key}
      `;
      
      return {
        count: 0,
        windowStart,
        region: entry.region
      };
    }

    // Create new entry (without region initially)
    await sql`
      INSERT INTO rate_limits (id, count, window_start)
      VALUES (${key}, 0, ${windowStart})
    `;

    return {
      count: 0,
      windowStart,
      region: null
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
 * Update the region for a rate limit entry
 */
export async function updateRateLimitRegion(key: string, region: string): Promise<void> {
  if (!sql) {
    throw new Error('Database not available in development mode');
  }

  try {
    await sql`
      UPDATE rate_limits 
      SET region = ${region}, updated_at = NOW()
      WHERE id = ${key}
    `;
  } catch (error) {
    console.error('❌ Failed to update rate limit region:', error);
    throw error;
  }
}

/**
 * Create or update a rate limit entry with region
 */
export async function createRateLimitWithRegion(
  key: string, 
  windowMs: number, 
  region?: string
): Promise<{ count: number; windowStart: number; region: string | null }> {
  if (!sql) {
    throw new Error('Database not available in development mode');
  }

  const now = Date.now();
  const windowStart = now - (now % windowMs); // Align to window boundary

  try {
    // Use upsert to handle both create and update cases
    await sql`
      INSERT INTO rate_limits (id, count, window_start, region)
      VALUES (${key}, 0, ${windowStart}, ${region || null})
      ON CONFLICT (id) DO UPDATE SET
        count = CASE 
          WHEN rate_limits.window_start = ${windowStart} THEN rate_limits.count
          ELSE 0
        END,
        window_start = ${windowStart},
        region = COALESCE(${region || null}, rate_limits.region),
        updated_at = NOW()
    `;

    // Get the current state
    const result = await sql`
      SELECT count, window_start, region
      FROM rate_limits 
      WHERE id = ${key}
    `;

    const entry = result[0];
    return {
      count: entry.count,
      windowStart: entry.window_start,
      region: entry.region
    };
  } catch (error) {
    console.error('❌ Failed to create/update rate limit with region:', error);
    throw error;
  }
}

/**
 * Get rate limiting statistics by region
 */
export async function getRateLimitStatsByRegion(): Promise<any> {
  if (!sql) {
    return { message: 'Database not available in development mode' };
  }

  try {
    // Get stats by region for phone entries
    const regionStats = await sql`
      SELECT 
        region,
        COUNT(*) as total_entries,
        SUM(count) as total_calls,
        AVG(count) as avg_calls_per_entry,
        MAX(updated_at) as last_activity
      FROM rate_limits 
      WHERE id LIKE 'phone_hash:%' 
        AND region IS NOT NULL
      GROUP BY region
      ORDER BY total_calls DESC
    `;

    // Get overall stats
    const overallStats = await sql`
      SELECT 
        COUNT(*) as total_phone_entries,
        COUNT(CASE WHEN region IS NOT NULL THEN 1 END) as entries_with_region,
        COUNT(CASE WHEN region IS NULL THEN 1 END) as entries_without_region
      FROM rate_limits 
      WHERE id LIKE 'phone_hash:%'
    `;

    return {
      regionBreakdown: regionStats,
      overall: overallStats[0],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to get rate limit stats by region:', error);
    return { error: 'Failed to retrieve regional statistics' };
  }
}

/**
 * Clean up old rate limit entries
 * Removes entries older than the specified age
 */
export async function cleanupOldRateLimitEntries(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  if (!sql) {
    throw new Error('Database not available in development mode');
  }

  const cutoffTime = Date.now() - olderThanMs;

  try {
    const result = await sql`
      DELETE FROM rate_limits 
      WHERE window_start < ${cutoffTime}
    `;

    const deletedCount = Array.isArray(result) ? result.length : 0;
    console.log(`🧹 Cleaned up ${deletedCount} old rate limit entries`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Failed to cleanup old rate limit entries:', error);
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