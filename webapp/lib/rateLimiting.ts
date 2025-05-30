/**
 * Next.js API Rate Limiting Utilities
 * 
 * This module provides rate limiting functionality specifically designed for
 * Next.js API routes. It uses in-memory caching to track request rates and
 * implements IP-based limiting with configurable windows and thresholds.
 * 
 * @fileoverview Rate limiting utilities for Next.js API routes
 * @version 1.0.0
 */

import NodeCache from 'node-cache';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * Configuration interface for API rate limiting
 */
interface RateLimitConfig {
  /** Time window in seconds for rate limiting */
  windowSec: number;
  /** Maximum number of requests allowed per window */
  maxRequests: number;
  /** Maximum number of calls allowed per window (for call endpoints) */
  maxCalls?: number;
}

/**
 * Result interface for rate limit checks
 */
export interface RateLimitResult {
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
 * Interface for tracking request counts per IP
 */
interface RequestTracker {
  /** Number of requests made in the current window */
  count: number;
  /** Timestamp when the current window started */
  windowStart: number;
}

// Global cache instance for rate limiting data
// TTL is set to 1 hour to ensure cleanup of old entries
const rateLimitCache = new NodeCache({ 
  stdTTL: 3600, // 1 hour TTL
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false 
});

/**
 * Default rate limiting configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints - more lenient
  api: {
    windowSec: 900, // 15 minutes
    maxRequests: 30,
  } as RateLimitConfig,
  
  // Call endpoints - more restrictive (aligned with websocket-server: 5 calls per hour)
  calls: {
    windowSec: 3600, // 1 hour (was 15 minutes)
    maxRequests: 5,   // 5 calls per hour (was 10 per 15 minutes)
    maxCalls: 5,      // Same limit for call-specific logic
  } as RateLimitConfig,
  
  // Authentication endpoints - very restrictive
  auth: {
    windowSec: 900, // 15 minutes
    maxRequests: 5,
  } as RateLimitConfig,
} as const;

/**
 * Extracts the client's IP address from a Next.js request
 * Handles various proxy configurations and header formats
 * 
 * @param request - Next.js request object
 * @returns The client's IP address or a unique identifier if IP cannot be determined
 */
export function getClientIP(request: NextRequest): string {
  // Check various proxy headers in order of preference
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  const xClientIP = request.headers.get('x-client-ip');

  // X-Forwarded-For can contain multiple IPs, take the first one
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Single IP headers
  if (xRealIP) return xRealIP;
  if (cfConnectingIP) return cfConnectingIP;
  if (xClientIP) return xClientIP;

  // Fallback to Next.js IP detection, or generate unique ID if unavailable
  // This prevents all unidentifiable requests from sharing the same rate limit bucket
  return request.ip ?? `unidentified-${randomUUID()}`;
}

/**
 * Implements rate limiting for API requests
 * 
 * This function checks if a request from a specific IP should be allowed
 * based on the configured rate limits. It uses a sliding window approach
 * where the window resets after the specified time period.
 * 
 * @param request - Next.js request object
 * @param config - Rate limiting configuration
 * @param identifier - Additional identifier to namespace the rate limit (optional)
 * @returns Promise resolving to rate limit result
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): Promise<RateLimitResult> {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = config.windowSec * 1000;
  
  // Create a unique key for this IP and identifier combination
  const key = identifier ? `${ip}:${identifier}` : ip;
  
  // Get or create tracker for this IP
  const tracker = rateLimitCache.get<RequestTracker>(key) || {
    count: 0,
    windowStart: now,
  };

  // Check if we're in a new window
  if (now - tracker.windowStart >= windowMs) {
    // Reset the window
    tracker.count = 0;
    tracker.windowStart = now;
  }

  // Check if request should be allowed
  const limit =
    identifier === "calls" && typeof config.maxCalls === "number"
      ? config.maxCalls
      : config.maxRequests;
  
  if (tracker.count >= limit) {
    // Request blocked
    const resetTime = tracker.windowStart + windowMs;
    
    console.warn(`🚫 Rate limit exceeded for IP ${ip}${identifier ? ` (${identifier})` : ''}: ${tracker.count}/${limit} requests`);
    
    return {
      success: false,
      remaining: 0,
      resetTime,
      error: `Too many requests. Limit: ${limit} per ${config.windowSec / 60} minutes`,
    };
  }

  // Allow the request and increment counter
  tracker.count++;
  
  // Calculate when this window should end
  const resetTime = tracker.windowStart + windowMs;
  
  // Expire exactly at the end of the current window instead of sliding on every hit
  const ttlSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));
  rateLimitCache.set(key, tracker, ttlSeconds);

  const remaining = limit - tracker.count;

  console.log(`✅ Rate limit check passed for IP ${ip}${identifier ? ` (${identifier})` : ''}: ${tracker.count}/${limit} requests`);

  return {
    success: true,
    remaining,
    resetTime,
  };
}

/**
 * Middleware function for Next.js API routes to apply rate limiting
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.calls);
 *   if (!rateLimitResult.success) {
 *     return NextResponse.json({ error: rateLimitResult.error }, { 
 *       status: 429,
 *       headers: getRateLimitHeaders(rateLimitResult)
 *     });
 *   }
 *   
 *   // Process the request...
 * }
 * ```
 * 
 * @param request - Next.js request object
 * @param config - Rate limiting configuration
 * @param identifier - Additional identifier for namespacing (optional)
 * @returns Promise resolving to rate limit result
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api,
  identifier?: string
): Promise<RateLimitResult> {
  return rateLimit(request, config, identifier);
}

/**
 * Generates HTTP headers for rate limiting responses
 * 
 * These headers help clients understand their current rate limit status
 * and when they can make requests again.
 * 
 * @param result - Rate limit result
 * @param config - Rate limiting configuration (optional)
 * @returns Object containing HTTP headers
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  config?: RateLimitConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };

  if (config) {
    headers['X-RateLimit-Limit'] = (config.maxCalls || config.maxRequests).toString();
    headers['X-RateLimit-Window'] = config.windowSec.toString();
  }

  if (!result.success) {
    headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString();
  }

  return headers;
}

/**
 * Resets rate limiting data for a specific IP address
 * 
 * This function can be used for administrative purposes or
 * for testing scenarios where you need to clear rate limits.
 * 
 * @param ip - IP address to reset
 * @param identifier - Specific identifier to reset (optional)
 */
export function resetRateLimit(ip: string, identifier?: string): void {
  const key = identifier ? `${ip}:${identifier}` : ip;
  rateLimitCache.del(key);
  console.log(`🔄 Rate limit reset for ${key}`);
}

/**
 * Gets current rate limiting statistics
 * 
 * This function provides insight into the current state of
 * rate limiting across all tracked IPs and identifiers.
 * 
 * @returns Object containing rate limiting statistics
 */
export function getRateLimitStats(): {
  totalTrackedIPs: number;
  cacheKeys: string[];
  cacheStats: any;
} {
  const keys = rateLimitCache.keys();
  const stats = rateLimitCache.getStats();
  
  return {
    totalTrackedIPs: keys.length,
    cacheKeys: keys,
    cacheStats: stats,
  };
}

/**
 * Utility function to create a standardized rate limit error response
 * 
 * @param result - Rate limit result (when success is false)
 * @param config - Rate limiting configuration
 * @returns Error response object
 */
export function createRateLimitErrorResponse(
  result: RateLimitResult,
  config?: RateLimitConfig
) {
  return {
    error: 'Rate limit exceeded',
    message: result.error || 'Too many requests',
    retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    resetTime: result.resetTime,
    limit: config ? (config.maxCalls || config.maxRequests) : undefined,
    window: config ? config.windowSec : undefined,
  };
} 