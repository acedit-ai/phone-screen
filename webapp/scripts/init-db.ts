#!/usr/bin/env node

/**
 * Standalone Database Initialization Script
 * 
 * This script initializes the database schema directly without requiring
 * the web server to be running. It can be used for local development
 * or deployment pipelines.
 */

import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface DatabaseResult {
  count: number;
}

async function initializeDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('💡 Make sure to set DATABASE_URL in your .env.local file');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('🔄 Initializing database schema...');

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

    console.log('✅ Database schema initialized successfully');
    console.log('📊 Tables created:');
    console.log('  - rate_limits (with indexes)');
    
    // Test the connection with a simple query
    const result = await sql`SELECT COUNT(*) as count FROM rate_limits` as DatabaseResult[];
    console.log(`📈 Current rate_limits entries: ${result[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase }; 