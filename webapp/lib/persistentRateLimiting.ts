/**
 * Persistent Rate Limiting with NeonDB
 * 
 * This module provides persistent rate limiting functionality using NeonDB,
 * replacing the in-memory cache approach with database-backed storage.
 * This ensures rate limits persist across deployments and work in distributed environments.
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { getRateLimit, incrementRateLimit, initializeDatabase } from './database';

/**
 * Check if we're running in development mode
 * Rate limiting is disabled in development for easier testing
 */
function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.VERCEL_ENV === 'development' ||
         !process.env.VERCEL_ENV; // Local development (no Vercel environment)
}

/**
 * Configuration interface for persistent rate limiting
 */
interface PersistentRateLimitConfig {
  /** Time window in seconds for rate limiting */
  windowSec: number;
  /** Maximum number of requests allowed per window */
  maxRequests: number;
  /** Maximum number of calls allowed per window (for call endpoints) */
  maxCalls?: number;
}

/**
 * Result interface for persistent rate limit checks
 */
export interface PersistentRateLimitResult {
  /** Whether the request should be allowed */
  success: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Timestamp when the rate limit resets */
  resetTime: number;
  /** Error message if the request is blocked */
  error?: string;
}

/**
 * Default persistent rate limiting configurations
 */
export const PERSISTENT_RATE_LIMIT_CONFIGS = {
  // General API endpoints - more lenient
  api: {
    windowSec: 900, // 15 minutes
    maxRequests: 30,
  } as PersistentRateLimitConfig,
  
  // Call endpoints - more restrictive
  calls: {
    windowSec: 900, // 15 minutes
    maxRequests: 10,
    maxCalls: 3,
  } as PersistentRateLimitConfig,
  
  // Phone number specific limits - very restrictive
  phone: {
    windowSec: 3600, // 1 hour
    maxRequests: 5,
    maxCalls: 2,
  } as PersistentRateLimitConfig,
  
  // Authentication endpoints - very restrictive
  auth: {
    windowSec: 900, // 15 minutes
    maxRequests: 5,
  } as PersistentRateLimitConfig,
} as const;

/**
 * Extracts the client's IP address from a Next.js request
 */
export function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  const xClientIP = request.headers.get('x-client-ip');

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  if (xRealIP) return xRealIP;
  if (cfConnectingIP) return cfConnectingIP;
  if (xClientIP) return xClientIP;

  return request.ip ?? `unidentified-${randomUUID()}`;
}

/**
 * Implements persistent rate limiting using NeonDB
 */
export async function persistentRateLimit(
  request: NextRequest,
  config: PersistentRateLimitConfig,
  identifier?: string
): Promise<PersistentRateLimitResult> {
  const ip = getClientIP(request);
  const windowMs = config.windowSec * 1000;
  
  // Skip rate limiting in development mode
  if (isDevMode()) {
    console.log(`🔧 Development mode: Skipping rate limit check for IP ${ip}${identifier ? ` (${identifier})` : ''}`);
    return {
      success: true,
      remaining: 999, // High number to indicate unlimited in dev
      resetTime: Date.now() + windowMs,
    };
  }
  
  // Create a unique key for this IP and identifier combination
  const key = identifier ? `${ip}:${identifier}` : ip;
  
  try {
    // Get current rate limit state from database
    const { count, windowStart } = await getRateLimit(key, windowMs);
    
    // Calculate the limit based on identifier
    const limit = identifier === "calls" && typeof config.maxCalls === "number"
      ? config.maxCalls
      : config.maxRequests;
    
    // Check if request should be allowed
    if (count >= limit) {
      const resetTime = windowStart + windowMs;
      
      console.warn(`🚫 Persistent rate limit exceeded for IP ${ip}${identifier ? ` (${identifier})` : ''}: ${count}/${limit} requests`);
      
      return {
        success: false,
        remaining: 0,
        resetTime,
        error: `Too many requests. Limit: ${limit} per ${config.windowSec / 60} minutes`,
      };
    }

    // Allow the request and increment counter in database
    const newCount = await incrementRateLimit(key);
    const resetTime = windowStart + windowMs;
    const remaining = Math.max(0, limit - newCount);

    console.log(`✅ Persistent rate limit check passed for IP ${ip}${identifier ? ` (${identifier})` : ''}: ${newCount}/${limit} requests`);

    return {
      success: true,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('❌ Persistent rate limit check failed:', error);
    
    // In case of database error, allow the request but log the issue
    // This prevents the service from being completely blocked by DB issues
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: Date.now() + windowMs,
    };
  }
}

/**
 * Special rate limiting for phone numbers
 * This tracks calls to specific phone numbers to prevent abuse
 */
export async function persistentPhoneRateLimit(
  phoneNumber: string,
  request: NextRequest,
  config: PersistentRateLimitConfig = PERSISTENT_RATE_LIMIT_CONFIGS.phone
): Promise<PersistentRateLimitResult> {
  // Normalize phone number (remove spaces, hyphens, etc.)
  const normalizedPhone = phoneNumber.replace(/[^\d+]/g, '');
  const windowMs = config.windowSec * 1000;
  
  // Skip rate limiting in development mode
  if (isDevMode()) {
    console.log(`🔧 Development mode: Skipping phone rate limit check for ${normalizedPhone}`);
    return {
      success: true,
      remaining: 999, // High number to indicate unlimited in dev
      resetTime: Date.now() + windowMs,
    };
  }
  
  // Create key for phone number rate limiting
  const phoneKey = `phone:${normalizedPhone}`;
  
  try {
    // Get current phone number rate limit state
    const { count, windowStart } = await getRateLimit(phoneKey, windowMs);
    
    const limit = config.maxCalls || config.maxRequests;
    
    if (count >= limit) {
      const resetTime = windowStart + windowMs;
      
      console.warn(`🚫 Phone number rate limit exceeded for ${normalizedPhone}: ${count}/${limit} calls`);
      
      return {
        success: false,
        remaining: 0,
        resetTime,
        error: `Too many calls to this number. Limit: ${limit} per ${config.windowSec / 3600} hour(s)`,
      };
    }

    // Allow the call and increment counter
    const newCount = await incrementRateLimit(phoneKey);
    const resetTime = windowStart + windowMs;
    const remaining = Math.max(0, limit - newCount);

    console.log(`✅ Phone number rate limit check passed for ${normalizedPhone}: ${newCount}/${limit} calls`);

    return {
      success: true,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('❌ Phone number rate limit check failed:', error);
    
    // Allow the request on database error
    return {
      success: true,
      remaining: (config.maxCalls || config.maxRequests) - 1,
      resetTime: Date.now() + windowMs,
    };
  }
}

/**
 * Initialize the persistent rate limiting system
 * Should be called at application startup
 */
export async function initializePersistentRateLimiting() {
  try {
    await initializeDatabase();
    console.log('✅ Persistent rate limiting system initialized');
  } catch (error) {
    console.error('❌ Failed to initialize persistent rate limiting:', error);
    throw error;
  }
}

/**
 * Get rate limit headers for API responses
 */
export function getPersistentRateLimitHeaders(
  result: PersistentRateLimitResult,
  config?: PersistentRateLimitConfig
): Record<string, string> {
  const limit = config ? 
    (config.maxCalls || config.maxRequests) : 
    'unknown';

  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'X-RateLimit-Reset-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
  };
} 