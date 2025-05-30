/**
 * Rate Limiting Configuration
 * 
 * This module provides centralized configuration for all rate limiting features
 * across the application. It includes settings for API endpoints, WebSocket
 * connections, and advanced protection mechanisms.
 * 
 * @fileoverview Rate limiting configuration and interfaces
 * @version 1.0.0
 */

/**
 * Configuration interface for API route rate limiting
 */
export interface ApiRateLimitConfig {
  /** Time window in milliseconds for rate limiting (default: 15 minutes) */
  windowMs: number;
  /** Maximum number of requests allowed per window per IP */
  maxRequests: number;
  /** Maximum number of outbound calls allowed per window per IP */
  maxCalls: number;
  /** Whether to trust proxy headers (X-Forwarded-For, etc.) */
  trustProxy: boolean;
  /** Custom message to send when rate limit is exceeded */
  message: string;
  /** Standard headers to include in rate limit responses */
  standardHeaders: boolean;
  /** Legacy headers to include for backwards compatibility */
  legacyHeaders: boolean;
}

/**
 * Configuration interface for WebSocket connection rate limiting
 */
export interface WebSocketRateLimitConfig {
  /** Maximum concurrent WebSocket connections per IP address */
  maxConnectionsPerIP: number;
  /** Maximum number of calls allowed per hour per IP */
  maxCallsPerHour: number;
  /** Global limit of concurrent active calls across all users */
  maxGlobalConcurrentCalls: number;
  /** Global limit of concurrent WebSocket connections across all users */
  maxGlobalConcurrentConnections: number;
  /** Maximum duration for a single call session in milliseconds */
  maxSessionDuration: number;
  /** Time window for call frequency limiting in milliseconds */
  callFrequencyWindow: number;
}

/**
 * Configuration interface for phone number-based rate limiting
 */
export interface PhoneRateLimitConfig {
  /** Maximum number of calls allowed per phone number within the window */
  maxCallsPerNumber: number;
  /** Time window for phone number rate limiting in milliseconds */
  windowMs: number;
  /** Cooldown period between calls to the same number in milliseconds */
  cooldownMs: number;
  /** Whether to enable phone number rate limiting */
  enabled: boolean;
}

/**
 * Configuration interface for penalty and progressive enforcement
 */
export interface PenaltyConfig {
  /** Duration to suspend repeat offenders in milliseconds */
  suspensionDuration: number;
  /** Whether to enable progressive delays for repeat requests */
  progressiveDelay: boolean;
  /** Delay increment for each subsequent request in milliseconds */
  delayIncrement: number;
  /** Maximum delay that can be applied in milliseconds */
  maxDelay: number;
  /** Number of violations before applying penalties */
  violationThreshold: number;
}

/**
 * Configuration interface for monitoring and logging
 */
export interface MonitoringConfig {
  /** Whether to enable detailed request logging */
  enableDetailedLogging: boolean;
  /** Whether to log rate limit violations */
  logViolations: boolean;
  /** Whether to enable metrics collection */
  collectMetrics: boolean;
  /** Interval for cleaning up old rate limit data in milliseconds */
  cleanupInterval: number;
}

/**
 * Master configuration interface combining all rate limiting settings
 */
export interface RateLimitConfig {
  api: ApiRateLimitConfig;
  websocket: WebSocketRateLimitConfig;
  phone: PhoneRateLimitConfig;
  penalties: PenaltyConfig;
  monitoring: MonitoringConfig;
}

/**
 * Default rate limiting configuration
 * 
 * These values are designed to be generous for legitimate users while
 * preventing abuse. They can be overridden via environment variables.
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 30, // 30 requests per 15 minutes per IP
    maxCalls: 2, // 2 calls per 15 minutes per IP (reduced from 3)
    trustProxy: true, // Trust reverse proxy headers
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  websocket: {
    maxConnectionsPerIP: 2, // 2 concurrent connections per IP
    maxCallsPerHour: 1, // 1 call per hour per IP (reduced from 5)
    maxGlobalConcurrentCalls: 10, // 10 total concurrent calls
    maxGlobalConcurrentConnections: 10, // 10 total concurrent connections
    maxSessionDuration: 5 * 60 * 1000, // 5 minutes per session (reduced from 10)
    callFrequencyWindow: 60 * 60 * 1000, // 1 hour window
  },
  phone: {
    maxCallsPerNumber: 2, // 2 calls per phone number per window (restrictive)
    windowMs: 60 * 60 * 1000, // 1 hour window 
    cooldownMs: 30 * 60 * 1000, // 30 minutes cooldown between calls
    enabled: true, // Enable phone number rate limiting
  },
  penalties: {
    suspensionDuration: 60 * 60 * 1000, // 1 hour suspension
    progressiveDelay: true,
    delayIncrement: 1000, // 1 second increments
    maxDelay: 10000, // Maximum 10 second delay
    violationThreshold: 3, // Apply penalties after 3 violations
  },
  monitoring: {
    enableDetailedLogging: true,
    logViolations: true,
    collectMetrics: true,
    cleanupInterval: 60 * 60 * 1000, // Clean up every hour
  },
};

/**
 * Creates a rate limit configuration by merging environment variables
 * with default values.
 * 
 * Environment variables that can override defaults:
 * - RATE_LIMIT_WINDOW_MS: API rate limit window in milliseconds
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window
 * - RATE_LIMIT_MAX_CALLS: Max calls per window
 * - RATE_LIMIT_MAX_CONCURRENT_CALLS: Global concurrent call limit
 * - RATE_LIMIT_MAX_CONCURRENT_CONNECTIONS: Global concurrent connection limit
 * - RATE_LIMIT_SESSION_DURATION: Max session duration in milliseconds
 * - RATE_LIMIT_SUSPENSION_DURATION: Penalty suspension duration
 * - RATE_LIMIT_PHONE_MAX_CALLS: Max calls per phone number per window
 * - RATE_LIMIT_PHONE_WINDOW_MS: Phone number rate limit window in milliseconds
 * - RATE_LIMIT_PHONE_COOLDOWN_MS: Cooldown between calls to same number in milliseconds
 * 
 * @returns {RateLimitConfig} The merged configuration object
 */
export function createRateLimitConfig(): RateLimitConfig {
  const config: RateLimitConfig = JSON.parse(JSON.stringify(DEFAULT_RATE_LIMIT_CONFIG));

  // Override with environment variables if present
  if (process.env.RATE_LIMIT_WINDOW_MS) {
    config.api.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
  }

  if (process.env.RATE_LIMIT_MAX_REQUESTS) {
    config.api.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
  }

  if (process.env.RATE_LIMIT_MAX_CALLS) {
    config.api.maxCalls = parseInt(process.env.RATE_LIMIT_MAX_CALLS, 10);
  }

  if (process.env.RATE_LIMIT_MAX_CONCURRENT_CALLS) {
    config.websocket.maxGlobalConcurrentCalls = parseInt(
      process.env.RATE_LIMIT_MAX_CONCURRENT_CALLS,
      10
    );
  }

  if (process.env.RATE_LIMIT_MAX_CONCURRENT_CONNECTIONS) {
    config.websocket.maxGlobalConcurrentConnections = parseInt(
      process.env.RATE_LIMIT_MAX_CONCURRENT_CONNECTIONS,
      10
    );
  }

  if (process.env.RATE_LIMIT_SESSION_DURATION) {
    config.websocket.maxSessionDuration = parseInt(
      process.env.RATE_LIMIT_SESSION_DURATION,
      10
    );
  }

  if (process.env.RATE_LIMIT_SUSPENSION_DURATION) {
    config.penalties.suspensionDuration = parseInt(
      process.env.RATE_LIMIT_SUSPENSION_DURATION,
      10
    );
  }

  // Phone number rate limiting environment variables
  if (process.env.RATE_LIMIT_PHONE_MAX_CALLS) {
    config.phone.maxCallsPerNumber = parseInt(
      process.env.RATE_LIMIT_PHONE_MAX_CALLS,
      10
    );
  }

  if (process.env.RATE_LIMIT_PHONE_WINDOW_MS) {
    config.phone.windowMs = parseInt(
      process.env.RATE_LIMIT_PHONE_WINDOW_MS,
      10
    );
  }

  if (process.env.RATE_LIMIT_PHONE_COOLDOWN_MS) {
    config.phone.cooldownMs = parseInt(
      process.env.RATE_LIMIT_PHONE_COOLDOWN_MS,
      10
    );
  }

  // Validate configuration values
  validateConfig(config);

  return config;
}

/**
 * Validates the rate limit configuration to ensure all values are reasonable
 * 
 * @param {RateLimitConfig} config - The configuration to validate
 * @throws {Error} If any configuration values are invalid
 */
function validateConfig(config: RateLimitConfig): void {
  const errors: string[] = [];

  // Validate API config
  if (config.api.windowMs < 1000) {
    errors.push('API window must be at least 1 second');
  }
  if (config.api.maxRequests < 1) {
    errors.push('API max requests must be at least 1');
  }
  if (config.api.maxCalls < 1) {
    errors.push('API max calls must be at least 1');
  }

  // Validate WebSocket config
  if (config.websocket.maxConnectionsPerIP < 1) {
    errors.push('Max connections per IP must be at least 1');
  }
  if (config.websocket.maxCallsPerHour < 1) {
    errors.push('WebSocket max calls per hour must be at least 1');
  }
  if (config.websocket.maxGlobalConcurrentCalls < 1) {
    errors.push('Global concurrent calls limit must be at least 1');
  }
  if (config.websocket.maxGlobalConcurrentConnections < 1) {
    errors.push('Global concurrent connections limit must be at least 1');
  }
  if (config.websocket.maxSessionDuration < 30000) {
    errors.push('Session duration must be at least 30 seconds');
  }
  if (config.websocket.callFrequencyWindow < 1000) {
    errors.push('Call-frequency window must be at least 1 second');
  }

  // Validate penalty config
  if (config.penalties.suspensionDuration < 60000) {
    errors.push('Suspension duration must be at least 1 minute');
  }
  if (config.penalties.delayIncrement < 0 || config.penalties.maxDelay < 0) {
    errors.push('Penalty delays must be positive numbers');
  }

  // Validate phone config
  if (config.phone.enabled) {
    if (config.phone.maxCallsPerNumber < 1) {
      errors.push('Phone max calls per number must be at least 1');
    }
    if (config.phone.windowMs < 60000) {
      errors.push('Phone rate limit window must be at least 1 minute');
    }
    if (config.phone.cooldownMs < 0) {
      errors.push('Phone cooldown must be a positive number');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Rate limit configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Gets a human-readable description of the current rate limiting settings
 * 
 * @param {RateLimitConfig} config - The configuration to describe
 * @returns {string} A formatted description of the limits
 */
export function describeRateLimits(config: RateLimitConfig): string {
  const windowMinutes = Math.round(config.api.windowMs / 60000);
  const sessionMinutes = Math.round(config.websocket.maxSessionDuration / 60000);
  const suspensionHours = Math.round(config.penalties.suspensionDuration / 3600000);

  return `
Rate Limiting Configuration:
  API Limits:
    - ${config.api.maxRequests} requests per ${windowMinutes} minutes per IP
    - ${config.api.maxCalls} calls per ${windowMinutes} minutes per IP
  
  WebSocket Limits:
    - ${config.websocket.maxConnectionsPerIP} concurrent connections per IP
    - ${config.websocket.maxCallsPerHour} calls per hour per IP
    - ${config.websocket.maxGlobalConcurrentCalls} total concurrent calls globally
    - ${config.websocket.maxGlobalConcurrentConnections} total concurrent connections globally
    - ${sessionMinutes} minute maximum session duration
  
  Phone Limits:
    - ${config.phone.maxCallsPerNumber} calls per phone number per ${config.phone.windowMs / 60000} minutes
  
  Penalties:
    - ${suspensionHours} hour suspension for repeat offenders
    - Progressive delays: ${config.penalties.progressiveDelay ? 'enabled' : 'disabled'}
  `.trim();
} 