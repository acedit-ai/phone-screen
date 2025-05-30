#!/usr/bin/env node

/**
 * Database Initialization Script
 * 
 * This script initializes the database schema for phone rate limiting.
 * It can be run during deployment or manually for setup.
 */

import * as dotenv from 'dotenv';
import { rateLimitDB } from './rateLimitDB';

// Load environment variables
dotenv.config();

async function initializeDatabase(): Promise<void> {
  console.log('🔄 Starting database initialization...');

  try {
    // Test database connection
    const isConnected = await rateLimitDB.testConnection();
    
    if (!isConnected) {
      console.error('❌ Failed to connect to database');
      console.log('💡 Make sure DATABASE_URL environment variable is set');
      process.exit(1);
    }

    console.log('✅ Database connection successful');

    // Initialize schema
    await rateLimitDB.initializeSchema();

    console.log('✅ Database initialization completed successfully');
    console.log('📊 Phone rate limiting database is ready');
    
    // Get current stats
    const stats = await rateLimitDB.getStats();
    console.log('📈 Current database stats:', stats);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase }; 