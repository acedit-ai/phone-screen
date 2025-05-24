/**
 * Express Rate Limiting Middleware
 *
 * This module provides Express.js middleware functions for implementing
 * rate limiting on API endpoints. It integrates with the core RateLimitService
 * and provides both general API rate limiting and specific call rate limiting.
 *
 * @fileoverview Express middleware for API rate limiting
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { RateLimitConfig } from "../config/rateLimiting";
import { RateLimitService } from "../services/rateLimitService";

/**
 * Extended Request interface to include rate limiting information
 */
export interface RateLimitedRequest extends Request {
  /** IP address of the client (potentially from proxy headers) */
  clientIP?: string;
  /** Rate limiting information */
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

/**
 * Utility function to extract the real IP address from request
 * Handles various proxy configurations and header formats
 *
 * @param req - Express request object
 * @param trustProxy - Whether to trust proxy headers
 * @returns The client's IP address
 */
export function getClientIP(req: Request, trustProxy: boolean = true): string {
  if (!trustProxy) {
    return req.socket.remoteAddress || "unknown";
  }

  // Check various proxy headers in order of preference
  const xForwardedFor = req.headers["x-forwarded-for"];
  const xRealIP = req.headers["x-real-ip"];
  const cfConnectingIP = req.headers["cf-connecting-ip"]; // Cloudflare
  const xClientIP = req.headers["x-client-ip"];

  // X-Forwarded-For can contain multiple IPs, take the first one
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    return ips.split(",")[0].trim();
  }

  // Single IP headers
  if (xRealIP && typeof xRealIP === "string") return xRealIP;
  if (cfConnectingIP && typeof cfConnectingIP === "string")
    return cfConnectingIP;
  if (xClientIP && typeof xClientIP === "string") return xClientIP;

  // Fallback to Express's IP detection
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Creates general API rate limiting middleware using express-rate-limit
 *
 * This middleware applies to all API endpoints and provides basic
 * request rate limiting with standard HTTP headers.
 *
 * @param config - Rate limiting configuration
 * @returns Express middleware function
 */
export function createApiRateLimitMiddleware(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.api.windowMs,
    max: config.api.maxRequests,
    message: {
      error: config.api.message,
      retryAfter: Math.ceil(config.api.windowMs / 1000),
    },
    standardHeaders: config.api.standardHeaders,
    legacyHeaders: config.api.legacyHeaders,

    // Custom key generator to ensure consistent IP extraction
    keyGenerator: (req: Request) => {
      const ip = getClientIP(req, config.api.trustProxy);
      (req as RateLimitedRequest).clientIP = ip;
      return ip;
    },

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      const ip = getClientIP(req, config.api.trustProxy);

      if (config.monitoring.logViolations) {
        console.warn(`🚫 API rate limit exceeded for IP: ${ip}`);
      }

      res.status(429).json({
        error: "Too many requests",
        message: config.api.message,
        retryAfter: Math.ceil(config.api.windowMs / 1000),
        type: "rate_limit_exceeded",
      });
    },

    // Skip rate limiting for certain conditions
    skip: (req: Request) => {
      // Skip rate limiting for health checks or monitoring endpoints
      return req.path === "/health" || req.path === "/metrics";
    },
  });
}

/**
 * Creates progressive slowdown middleware using express-slow-down
 *
 * This middleware gradually increases response delay for clients
 * making too many requests, providing a gentler rate limiting approach.
 *
 * @param config - Rate limiting configuration
 * @returns Express middleware function
 */
export function createProgressiveSlowdownMiddleware(config: RateLimitConfig) {
  if (!config.penalties.progressiveDelay) {
    // Return a no-op middleware if progressive delay is disabled
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return slowDown({
    windowMs: config.api.windowMs,
    delayAfter: Math.floor(config.api.maxRequests * 0.7), // Start slowing down at 70% of limit
    delayMs: config.penalties.delayIncrement,
    maxDelayMs: config.penalties.maxDelay,

    // Custom key generator
    keyGenerator: (req: Request) => getClientIP(req, config.api.trustProxy),

    // Skip for the same conditions as rate limiting
    skip: (req: Request) => req.path === "/health" || req.path === "/metrics",
  });
}

/**
 * Creates specialized call rate limiting middleware
 *
 * This middleware specifically handles rate limiting for call-related
 * endpoints with tighter restrictions and integration with the
 * RateLimitService for cross-system coordination.
 *
 * @param config - Rate limiting configuration
 * @param rateLimitService - Rate limiting service instance
 * @returns Express middleware function
 */
export function createCallRateLimitMiddleware(
  config: RateLimitConfig,
  rateLimitService: RateLimitService
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ip = getClientIP(req, config.api.trustProxy);
      (req as RateLimitedRequest).clientIP = ip;

      // Check call-specific rate limits
      const result = await rateLimitService.checkCallFrequencyLimit(ip);

      if (!result.allowed) {
        if (config.monitoring.logViolations) {
          console.warn(
            `🚫 Call rate limit exceeded for IP: ${ip} - ${result.reason}`
          );
        }

        res.status(429).json({
          error: "Call rate limit exceeded",
          message: result.reason,
          retryAfter: result.resetTime
            ? Math.ceil(result.resetTime / 1000)
            : undefined,
          type: "call_rate_limit_exceeded",
        });
        return;
      }

      // Apply progressive delay if needed
      if (result.delay && result.delay > 0) {
        if (config.monitoring.enableDetailedLogging) {
          console.log(`⏱️  Applying ${result.delay}ms delay for IP: ${ip}`);
        }

        await new Promise((resolve) => setTimeout(resolve, result.delay));
      }

      // Add rate limiting info to request
      const resetTime = result.resetTime || (Date.now() + config.api.windowMs);
      (req as RateLimitedRequest).rateLimit = {
        limit: config.api.maxCalls,
        remaining: result.remaining || 0,
        reset: new Date(resetTime),
      };

      next();
    } catch (error) {
      console.error("Error in call rate limit middleware:", error);
      // On error, allow the request to proceed but log the issue
      next();
    }
  };
}

/**
 * Middleware to add rate limiting headers to responses
 *
 * This middleware adds informational headers about rate limiting
 * status to help clients understand their current limits.
 *
 * @param config - Rate limiting configuration
 * @returns Express middleware function
 */
export function addRateLimitHeaders(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rateLimitedReq = req as RateLimitedRequest;

    if (rateLimitedReq.rateLimit) {
      // Add defensive checks for all properties
      const headers: Record<string, string> = {};
      
      if (typeof rateLimitedReq.rateLimit.limit === 'number') {
        headers["X-RateLimit-Limit"] = rateLimitedReq.rateLimit.limit.toString();
      }
      
      if (typeof rateLimitedReq.rateLimit.remaining === 'number') {
        headers["X-RateLimit-Remaining"] = rateLimitedReq.rateLimit.remaining.toString();
      }
      
      if (rateLimitedReq.rateLimit.reset && rateLimitedReq.rateLimit.reset instanceof Date && !isNaN(rateLimitedReq.rateLimit.reset.getTime())) {
        headers["X-RateLimit-Reset"] = rateLimitedReq.rateLimit.reset.getTime().toString();
      }
      
      res.set(headers);
    }

    // Add general rate limiting policy headers
    res.set({
      "X-RateLimit-Policy": `${config.api.maxRequests} requests per ${Math.ceil(
        config.api.windowMs / 60000
      )} minutes`,
      "X-Call-Limit-Policy": `${config.api.maxCalls} calls per ${Math.ceil(
        config.api.windowMs / 60000
      )} minutes`,
    });

    next();
  };
}

/**
 * Error handling middleware for rate limiting errors
 *
 * This middleware catches and handles any errors that occur
 * during rate limiting processing.
 *
 * @param config - Rate limiting configuration
 * @returns Express error middleware function
 */
export function rateLimitErrorHandler(config: RateLimitConfig) {
  return (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (error.type === "rate_limit" || error.code === "RATE_LIMITED") {
      const ip = getClientIP(req, config.api.trustProxy);

      if (config.monitoring.logViolations) {
        console.error(`💥 Rate limiting error for IP ${ip}:`, error.message);
      }

      res.status(429).json({
        error: "Rate limiting error",
        message: "Unable to process request due to rate limiting",
        type: "rate_limit_error",
      });
      return;
    }

    next(error);
  };
}

/**
 * Middleware to log rate limiting metrics
 *
 * This middleware logs detailed information about rate limiting
 * for monitoring and debugging purposes.
 *
 * @param config - Rate limiting configuration
 * @param rateLimitService - Rate limiting service instance
 * @returns Express middleware function
 */
export function rateLimitLoggingMiddleware(
  config: RateLimitConfig,
  rateLimitService: RateLimitService
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.monitoring.enableDetailedLogging) {
      return next();
    }

    const startTime = Date.now();
    const ip = getClientIP(req, config.api.trustProxy);

    // Log request
    console.log(`📊 Request from ${ip}: ${req.method} ${req.path}`);

    // Override res.end to log response
    const originalEnd = res.end.bind(res);
    res.end = function (this: Response, ...args: any[]) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      console.log(`📊 Response to ${ip}: ${statusCode} (${duration}ms)`);

      // Log metrics periodically
      if (Math.random() < 0.1) {
        // 10% sampling
        const metrics = rateLimitService.getMetrics();
        console.log("📊 Rate limiting metrics:", metrics);
      }

      return originalEnd(...args);
    };

    next();
  };
}
