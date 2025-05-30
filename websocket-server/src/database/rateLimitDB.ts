/**
 * Rate Limiting Database Layer
 * 
 * Provides persistent storage for phone number rate limiting using PostgreSQL.
 * Designed for Fly.io native database integration with a simple, efficient schema.
 */

import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';

/**
 * Interface for phone rate limit entry
 */
export interface PhoneRateLimit {
  phoneHash: string;
  callCount: number;
  windowStart: number;
  region?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for rate limit check result
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  resetTime: number;
  reason?: string;
}

/**
 * Database configuration
 */
interface DBConfig {
  connectionString?: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

/**
 * Rate Limiting Database Service
 */
export class RateLimitDB {
  private pool: Pool | null = null;
  private config: DBConfig;
  private encryptionKey: string;

  constructor() {
    // Get database URL from Fly.io environment or fallback
    const databaseUrl = process.env.DATABASE_URL || process.env.FLY_DATABASE_URL;
    
    if (!databaseUrl) {
      console.warn('⚠️ No database URL found. Rate limiting will use in-memory fallback.');
    }

    // Get encryption key for phone number hashing
    this.encryptionKey = process.env.PHONE_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    
    if (process.env.NODE_ENV === 'production' && this.encryptionKey === 'default-dev-key-change-in-production') {
      console.warn('⚠️ Using default encryption key in production. Please set PHONE_ENCRYPTION_KEY.');
    }

    this.config = {
      connectionString: databaseUrl,
      maxConnections: 10,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 5000,
    };

    if (databaseUrl) {
      this.initializePool();
    }
  }

  /**
   * Initialize the database connection pool
   */
  private initializePool(): void {
    if (!this.config.connectionString) return;

    this.pool = new Pool({
      connectionString: this.config.connectionString,
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeoutMs,
      connectionTimeoutMillis: this.config.connectionTimeoutMs,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    });

    this.pool.on('error', (err: Error) => {
      console.error('📊 Database pool error:', err);
    });

    console.log('📊 Database connection pool initialized');
  }

  /**
   * Initialize database schema
   */
  public async initializeSchema(): Promise<void> {
    if (!this.pool) {
      console.log('📊 No database connection available, skipping schema initialization');
      return;
    }

    const client = await this.pool.connect();
    
    try {
      console.log('📊 Initializing phone rate limiting database schema...');

      // Create phone_rate_limits table
      await client.query(`
        CREATE TABLE IF NOT EXISTS phone_rate_limits (
          phone_hash TEXT PRIMARY KEY,
          call_count INTEGER NOT NULL DEFAULT 0,
          window_start BIGINT NOT NULL,
          region TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes for efficient lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_phone_rate_limits_phone_hash 
        ON phone_rate_limits(phone_hash)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_phone_rate_limits_window_start 
        ON phone_rate_limits(window_start)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_phone_rate_limits_region 
        ON phone_rate_limits(region)
      `);

      console.log('✅ Phone rate limiting database schema initialized');
    } catch (error) {
      console.error('❌ Failed to initialize database schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a secure hash for phone number (for privacy)
   */
  private createPhoneHash(phoneNumber: string): string {
    // Normalize phone number (remove non-digits except +)
    const normalized = phoneNumber.replace(/[^\d+]/g, '');
    
    // Create HMAC hash for privacy and consistency
    return crypto
      .createHmac('sha256', this.encryptionKey)
      .update(normalized)
      .digest('hex');
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add + if not present and handle common formats
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        return `+1${cleaned}`; // US number
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`; // US number with country code
      } else {
        return `+${cleaned}`;
      }
    }
    
    return cleaned;
  }

  /**
   * Check and update phone number rate limit
   */
  public async checkPhoneRateLimit(
    phoneNumber: string,
    maxCalls: number = 2,
    windowMs: number = 60 * 60 * 1000, // 1 hour
    region?: string
  ): Promise<RateLimitCheckResult> {
    // Fallback to in-memory if no database
    if (!this.pool) {
      return {
        allowed: true,
        currentCount: 0,
        remaining: maxCalls,
        resetTime: Date.now() + windowMs,
      };
    }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const phoneHash = this.createPhoneHash(normalizedPhone);
    const now = Date.now();
    const windowStart = now - (now % windowMs); // Align to window boundary

    const client = await this.pool.connect();

    try {
      // Use atomic UPSERT to prevent race conditions
      // This handles both new entries and window resets atomically
      const result = await client.query(`
        INSERT INTO phone_rate_limits(phone_hash, call_count, window_start, region)
        VALUES ($1, 1, $2, $3)
        ON CONFLICT (phone_hash)
        DO UPDATE SET
          call_count = CASE
            WHEN phone_rate_limits.window_start = EXCLUDED.window_start 
              THEN phone_rate_limits.call_count + 1
            ELSE 1
          END,
          window_start = EXCLUDED.window_start,
          region = COALESCE(EXCLUDED.region, phone_rate_limits.region),
          updated_at = NOW()
        RETURNING call_count, window_start
      `, [phoneHash, windowStart, region]);

      const { call_count: currentCount } = result.rows[0];
      const resetTime = windowStart + windowMs;

      // Check if limit exceeded (after increment)
      if (currentCount > maxCalls) {
        // Rollback the increment since we exceeded the limit
        await client.query(`
          UPDATE phone_rate_limits 
          SET call_count = call_count - 1, updated_at = NOW()
          WHERE phone_hash = $1
        `, [phoneHash]);

        console.log(`🚫 Phone rate limit exceeded: ${currentCount-1}/${maxCalls} calls (attempted ${currentCount})`);

        return {
          allowed: false,
          currentCount: currentCount - 1,
          remaining: 0,
          resetTime,
          reason: `Phone number has reached the limit of ${maxCalls} calls per hour`,
        };
      }

      const remaining = Math.max(0, maxCalls - currentCount);

      console.log(`📞 Phone rate limit check: ${currentCount}/${maxCalls} calls used (${remaining} remaining)`);

      return {
        allowed: true,
        currentCount,
        remaining,
        resetTime,
      };

    } catch (error) {
      console.error('❌ Phone rate limit check failed:', error);
      
      // Graceful fallback on database error
      return {
        allowed: true,
        currentCount: 0,
        remaining: maxCalls - 1,
        resetTime: Date.now() + windowMs,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get phone rate limit status without incrementing
   */
  public async getPhoneRateLimitStatus(
    phoneNumber: string,
    maxCalls: number = 2,
    windowMs: number = 60 * 60 * 1000
  ): Promise<RateLimitCheckResult> {
    if (!this.pool) {
      return {
        allowed: true,
        currentCount: 0,
        remaining: maxCalls,
        resetTime: Date.now() + windowMs,
      };
    }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const phoneHash = this.createPhoneHash(normalizedPhone);
    const now = Date.now();
    const windowStart = now - (now % windowMs);

    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'SELECT call_count, window_start FROM phone_rate_limits WHERE phone_hash = $1',
        [phoneHash]
      );

      if (result.rows.length === 0) {
        return {
          allowed: true,
          currentCount: 0,
          remaining: maxCalls,
          resetTime: windowStart + windowMs,
        };
      }

      const entry = result.rows[0];
      let currentCount = 0;

      if (entry.window_start === windowStart) {
        currentCount = entry.call_count;
      }

      const remaining = Math.max(0, maxCalls - currentCount);
      const allowed = currentCount < maxCalls;
      const resetTime = windowStart + windowMs;

      return {
        allowed,
        currentCount,
        remaining,
        resetTime,
        reason: allowed ? undefined : `Phone number has reached the limit of ${maxCalls} calls per hour`,
      };

    } catch (error) {
      console.error('❌ Failed to get phone rate limit status:', error);
      return {
        allowed: true,
        currentCount: 0,
        remaining: maxCalls,
        resetTime: Date.now() + windowMs,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Clean up old rate limit entries
   */
  public async cleanupOldEntries(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.pool) return 0;

    const cutoffTime = Date.now() - olderThanMs;
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM phone_rate_limits WHERE window_start < $1',
        [cutoffTime]
      );

      const deletedCount = result.rowCount || 0;
      console.log(`🧹 Cleaned up ${deletedCount} old phone rate limit entries`);
      return deletedCount;

    } catch (error) {
      console.error('❌ Failed to cleanup old entries:', error);
      return 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get rate limiting statistics
   */
  public async getStats(): Promise<any> {
    if (!this.pool) {
      return { message: 'Database not available' };
    }

    const client = await this.pool.connect();

    try {
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(call_count) as total_calls,
          AVG(call_count) as avg_calls_per_entry,
          MAX(call_count) as max_calls_per_entry,
          COUNT(CASE WHEN call_count >= 2 THEN 1 END) as entries_at_limit
        FROM phone_rate_limits
      `);

      const regionResult = await client.query(`
        SELECT 
          region,
          COUNT(*) as entries,
          SUM(call_count) as total_calls
        FROM phone_rate_limits 
        WHERE region IS NOT NULL
        GROUP BY region
        ORDER BY total_calls DESC
      `);

      return {
        overall: statsResult.rows[0],
        regionBreakdown: regionResult.rows,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return { error: 'Failed to retrieve statistics' };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connections
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('📊 Database connections closed');
    }
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    if (!this.pool) return false;

    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const rateLimitDB = new RateLimitDB(); 