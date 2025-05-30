/**
 * Rate Limiting Service
 *
 * This service provides centralized rate limiting functionality for the entire
 * application. It tracks connections, call frequency, violations, and implements
 * progressive penalties for abuse prevention.
 *
 * @fileoverview Comprehensive rate limiting service implementation
 * @version 1.0.0
 */

import NodeCache from "node-cache";
import { RateLimitConfig } from "../config/rateLimiting";

/**
 * Interface representing a connection tracking entry
 */
interface ConnectionEntry {
  /** Number of active WebSocket connections */
  activeConnections: number;
  /** Timestamp of first connection in current window */
  firstConnectionTime: number;
}

/**
 * Interface representing a call tracking entry
 */
interface CallEntry {
  /** Array of call timestamps within the tracking window */
  callTimes: number[];
  /** Number of currently active calls */
  activeCalls: number;
}

/**
 * Interface representing a phone number tracking entry
 */
interface PhoneEntry {
  /** Array of call timestamps for this phone number within the tracking window */
  callTimes: number[];
  /** Timestamp of last call to this number */
  lastCallTime: number;
}

/**
 * Interface representing a violation tracking entry
 */
interface ViolationEntry {
  /** Number of violations within the penalty window */
  count: number;
  /** Timestamp when the suspension (if any) expires */
  suspendedUntil?: number;
  /** Progressive delay to apply to next request */
  progressiveDelay: number;
}

/**
 * Interface for rate limit check results
 */
export interface RateLimitResult {
  /** Whether the request should be allowed */
  allowed: boolean;
  /** Reason for denial if not allowed */
  reason?: string;
  /** Delay to apply before processing (in milliseconds) */
  delay?: number;
  /** Time until rate limit resets (in milliseconds) */
  resetTime?: number;
  /** Remaining quota for this time window */
  remaining?: number;
}

/**
 * Interface for rate limiting metrics
 */
export interface RateLimitMetrics {
  /** Total number of requests processed */
  totalRequests: number;
  /** Number of requests blocked by rate limiting */
  blockedRequests: number;
  /** Number of active connections across all IPs */
  activeConnections: number;
  /** Number of active calls across all IPs */
  activeCalls: number;
  /** Number of IPs currently suspended */
  suspendedIPs: number;
}

/**
 * Rate Limiting Service Class
 *
 * Provides comprehensive rate limiting functionality including:
 * - Connection tracking per IP
 * - Call frequency limiting
 * - Global concurrent call limits
 * - Progressive penalties for violations
 * - Metrics collection and monitoring
 */
export class RateLimitService {
  private config: RateLimitConfig;
  private connectionCache: NodeCache;
  private callCache: NodeCache;
  private phoneCache: NodeCache;
  private violationCache: NodeCache;
  private metrics: RateLimitMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Creates a new RateLimitService instance
   *
   * @param config - Rate limiting configuration
   */
  constructor(config: RateLimitConfig) {
    this.config = config;
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      activeConnections: 0,
      activeCalls: 0,
      suspendedIPs: 0,
    };

    // Initialize caches with appropriate TTL values
    this.connectionCache = new NodeCache({
      stdTTL: Math.ceil(config.websocket.callFrequencyWindow / 1000), // Convert to seconds
      checkperiod: 60, // Check for expired keys every minute
      useClones: false,
    });

    this.callCache = new NodeCache({
      stdTTL: Math.ceil(config.websocket.callFrequencyWindow / 1000),
      checkperiod: 60,
      useClones: false,
    });

    this.phoneCache = new NodeCache({
      stdTTL: Math.ceil(config.websocket.callFrequencyWindow / 1000),
      checkperiod: 60,
      useClones: false,
    });

    this.violationCache = new NodeCache({
      stdTTL: Math.ceil(config.penalties.suspensionDuration / 1000),
      checkperiod: 60,
      useClones: false,
    });

    // Set up periodic cleanup
    if (config.monitoring.cleanupInterval > 0) {
      this.startCleanupInterval();
    }

    console.log("🛡️  Rate limiting service initialized");
    if (config.monitoring.enableDetailedLogging) {
      console.log(
        "📊 Rate limiting configuration loaded:",
        this.getConfigSummary()
      );
    }
  }

  /**
   * Checks if a new WebSocket connection should be allowed
   *
   * @param ipAddress - IP address of the connecting client
   * @returns Promise resolving to rate limit result
   */
  public async checkConnectionLimit(
    ipAddress: string
  ): Promise<RateLimitResult> {
    this.metrics.totalRequests++;

    // Check if IP is currently suspended
    const violationEntry = this.violationCache.get<ViolationEntry>(ipAddress);
    if (
      violationEntry?.suspendedUntil &&
      violationEntry.suspendedUntil > Date.now()
    ) {
      this.metrics.blockedRequests++;
      return {
        allowed: false,
        reason: "IP address is temporarily suspended",
        resetTime: violationEntry.suspendedUntil - Date.now(),
      };
    }

    // Check global concurrent connection limit
    if (
      this.metrics.activeConnections >=
      this.config.websocket.maxGlobalConcurrentConnections
    ) {
      this.metrics.blockedRequests++;
      this.recordViolation(ipAddress, "global_limit_exceeded");
      return {
        allowed: false,
        reason: "Global connection limit exceeded",
      };
    }

    // Check per-IP connection limit
    const connectionEntry = this.connectionCache.get<ConnectionEntry>(
      ipAddress
    ) || {
      activeConnections: 0,
      firstConnectionTime: Date.now(),
    };

    if (
      connectionEntry.activeConnections >=
      this.config.websocket.maxConnectionsPerIP
    ) {
      this.metrics.blockedRequests++;
      this.recordViolation(ipAddress, "ip_connection_limit_exceeded");
      return {
        allowed: false,
        reason: `Too many concurrent connections from this IP (max: ${this.config.websocket.maxConnectionsPerIP})`,
      };
    }

    // Allow the connection
    connectionEntry.activeConnections++;
    this.connectionCache.set(ipAddress, connectionEntry);
    this.metrics.activeConnections++;

    return {
      allowed: true,
      remaining:
        this.config.websocket.maxConnectionsPerIP -
        connectionEntry.activeConnections,
    };
  }

  /**
   * Checks if a new call should be allowed based on frequency limits
   *
   * @param ipAddress - IP address of the calling client
   * @returns Promise resolving to rate limit result
   */
  public async checkCallFrequencyLimit(
    ipAddress: string
  ): Promise<RateLimitResult> {
    this.metrics.totalRequests++;

    // Check if IP is currently suspended
    const violationEntry = this.violationCache.get<ViolationEntry>(ipAddress);
    if (
      violationEntry?.suspendedUntil &&
      violationEntry.suspendedUntil > Date.now()
    ) {
      this.metrics.blockedRequests++;
      return {
        allowed: false,
        reason: "IP address is temporarily suspended",
        resetTime: violationEntry.suspendedUntil - Date.now(),
      };
    }

    const now = Date.now();
    const windowStart = now - this.config.websocket.callFrequencyWindow;

    // Get or create call entry for this IP
    const callEntry = this.callCache.get<CallEntry>(ipAddress) || {
      callTimes: [],
      activeCalls: 0,
    };

    // Remove calls outside the current window
    callEntry.callTimes = callEntry.callTimes.filter(
      (time: number) => time > windowStart
    );

    // Check call frequency limit
    if (callEntry.callTimes.length >= this.config.websocket.maxCallsPerHour) {
      this.metrics.blockedRequests++;
      this.recordViolation(ipAddress, "call_frequency_exceeded");

      const oldestCall = Math.min(...callEntry.callTimes);
      const resetTime =
        oldestCall + this.config.websocket.callFrequencyWindow - now;

      return {
        allowed: false,
        reason: `Too many calls from this IP (max: ${this.config.websocket.maxCallsPerHour} per hour)`,
        resetTime: Math.max(0, resetTime),
      };
    }

    // Check global concurrent call limit
    if (
      this.metrics.activeCalls >= this.config.websocket.maxGlobalConcurrentCalls
    ) {
      this.metrics.blockedRequests++;
      this.recordViolation(ipAddress, "global_call_limit_exceeded");
      return {
        allowed: false,
        reason: "Global call limit exceeded",
      };
    }

    // Apply progressive delay if needed
    let delay = 0;
    if (violationEntry && this.config.penalties.progressiveDelay) {
      delay = Math.min(
        violationEntry.progressiveDelay,
        this.config.penalties.maxDelay
      );
    }

    // Allow the call
    callEntry.callTimes.push(now);
    callEntry.activeCalls++;
    this.callCache.set(ipAddress, callEntry);
    this.metrics.activeCalls++;

    // Calculate when the oldest call in the window will expire
    const oldestCall = Math.min(...callEntry.callTimes);
    const resetTime =
      oldestCall + this.config.websocket.callFrequencyWindow - now;

    return {
      allowed: true,
      delay,
      remaining:
        this.config.websocket.maxCallsPerHour - callEntry.callTimes.length,
      resetTime: Math.max(0, resetTime),
    };
  }

  /**
   * Checks if a call to a specific phone number should be allowed
   *
   * @param phoneNumber - Phone number being called (in E.164 format)
   * @param ipAddress - IP address of the calling client (for logging)
   * @returns Promise resolving to rate limit result
   */
  public async checkPhoneNumberLimit(
    phoneNumber: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    // Normalize phone number for consistent tracking
    const normalizedPhoneNumber = this.normalizePhoneNumber(phoneNumber);

    // Skip if phone number rate limiting is disabled
    if (!this.config.phone.enabled) {
      return { allowed: true };
    }

    const now = Date.now();
    const windowStart = now - this.config.phone.windowMs;

    // Get or create phone entry for this number
    const phoneEntry = this.phoneCache.get<PhoneEntry>(
      normalizedPhoneNumber
    ) || {
      callTimes: [],
      lastCallTime: 0,
    };

    // Remove calls outside the current window
    phoneEntry.callTimes = phoneEntry.callTimes.filter(
      (time: number) => time > windowStart
    );

    // Check if we're within the cooldown period
    if (phoneEntry.lastCallTime > 0) {
      const timeSinceLastCall = now - phoneEntry.lastCallTime;
      if (timeSinceLastCall < this.config.phone.cooldownMs) {
        const remainingCooldown =
          this.config.phone.cooldownMs - timeSinceLastCall;

        if (this.config.monitoring.logViolations) {
          console.warn(
            `🚫 Phone number ${normalizedPhoneNumber} is in cooldown period (${Math.ceil(
              remainingCooldown / 1000
            )}s remaining)${ipAddress ? ` - IP: ${ipAddress}` : ""}`
          );
        }

        return {
          allowed: false,
          reason: `Phone number is in cooldown period. Please wait ${Math.ceil(
            remainingCooldown / 1000
          )} seconds before calling again.`,
          resetTime: remainingCooldown,
        };
      }
    }

    // Check call frequency limit for this phone number
    if (phoneEntry.callTimes.length >= this.config.phone.maxCallsPerNumber) {
      const oldestCall = Math.min(...phoneEntry.callTimes);
      const resetTime = oldestCall + this.config.phone.windowMs - now;

      if (this.config.monitoring.logViolations) {
        console.warn(
          `🚫 Phone number ${normalizedPhoneNumber} has exceeded call limit (${
            this.config.phone.maxCallsPerNumber
          } calls per ${this.config.phone.windowMs / 60000} minutes)${
            ipAddress ? ` - IP: ${ipAddress}` : ""
          }`
        );
      }

      return {
        allowed: false,
        reason: `Too many calls to this phone number (max: ${
          this.config.phone.maxCallsPerNumber
        } per ${Math.ceil(this.config.phone.windowMs / 60000)} minutes)`,
        resetTime: Math.max(0, resetTime),
        remaining: 0,
      };
    }

    // Allow the call - record it
    phoneEntry.callTimes.push(now);
    phoneEntry.lastCallTime = now;
    this.phoneCache.set(normalizedPhoneNumber, phoneEntry);

    // Calculate remaining calls and reset time
    const remaining =
      this.config.phone.maxCallsPerNumber - phoneEntry.callTimes.length;
    const oldestCall =
      phoneEntry.callTimes.length > 0 ? Math.min(...phoneEntry.callTimes) : now;
    const resetTime = oldestCall + this.config.phone.windowMs - now;

    if (this.config.monitoring.enableDetailedLogging) {
      console.log(
        `📞 Phone call allowed to ${normalizedPhoneNumber} (${remaining} calls remaining)${
          ipAddress ? ` - IP: ${ipAddress}` : ""
        }`
      );
    }

    return {
      allowed: true,
      remaining,
      resetTime: Math.max(0, resetTime),
    };
  }

  /**
   * Normalizes phone number to E.164 format for consistent tracking
   *
   * @param phoneNumber - Phone number in any format
   * @returns Normalized phone number in E.164 format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except leading +
    const cleaned = phoneNumber.replace(/[^\d+]/g, "");

    // Ensure E.164 format (starts with +)
    if (!cleaned.startsWith("+")) {
      // If it's 10 digits, assume US number
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      }
      // If it's 11 digits and starts with 1, add +
      if (cleaned.length === 11 && cleaned.startsWith("1")) {
        return `+${cleaned}`;
      }
      // Default: assume US number
      return `+1${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Records that a WebSocket connection has been closed
   *
   * @param ipAddress - IP address of the disconnecting client
   */
  public recordConnectionClosed(ipAddress: string): void {
    const connectionEntry =
      this.connectionCache.get<ConnectionEntry>(ipAddress);
    if (connectionEntry && connectionEntry.activeConnections > 0) {
      connectionEntry.activeConnections--;
      this.connectionCache.set(ipAddress, connectionEntry);
    }
    // Always decrement the metric – it tracks reality, not cache state
    this.metrics.activeConnections = Math.max(
      0,
      this.metrics.activeConnections - 1
    );
  }

  /**
   * Records that a call has ended
   *
   * @param ipAddress - IP address of the client whose call ended
   */
  public recordCallEnded(ipAddress: string): void {
    const callEntry = this.callCache.get<CallEntry>(ipAddress);
    if (callEntry && callEntry.activeCalls > 0) {
      callEntry.activeCalls--;
      this.callCache.set(ipAddress, callEntry);
    }
    // Always decrement the metric – it tracks reality, not cache state
    this.metrics.activeCalls = Math.max(0, this.metrics.activeCalls - 1);
  }

  /**
   * Records a rate limiting violation for progressive penalties
   *
   * @param ipAddress - IP address that violated the limits
   * @param violationType - Type of violation that occurred
   */
  private recordViolation(ipAddress: string, violationType: string): void {
    if (!this.config.monitoring.logViolations) return;

    const violationEntry = this.violationCache.get<ViolationEntry>(
      ipAddress
    ) || {
      count: 0,
      progressiveDelay: 0,
    };

    violationEntry.count++;

    // Apply progressive delay
    if (this.config.penalties.progressiveDelay) {
      violationEntry.progressiveDelay = Math.min(
        violationEntry.progressiveDelay + this.config.penalties.delayIncrement,
        this.config.penalties.maxDelay
      );
    }

    // Apply suspension if threshold is exceeded
    if (violationEntry.count >= this.config.penalties.violationThreshold) {
      violationEntry.suspendedUntil =
        Date.now() + this.config.penalties.suspensionDuration;
      this.metrics.suspendedIPs++;

      if (this.config.monitoring.logViolations) {
        console.warn(
          `🚫 IP ${ipAddress} suspended for ${Math.round(
            this.config.penalties.suspensionDuration / 60000
          )} minutes due to repeated violations`
        );
      }
    }

    this.violationCache.set(ipAddress, violationEntry);

    if (this.config.monitoring.logViolations) {
      console.warn(
        `⚠️  Rate limit violation from ${ipAddress}: ${violationType} (count: ${violationEntry.count})`
      );
    }
  }

  /**
   * Gets current rate limiting metrics
   *
   * @returns Current metrics object
   */
  public getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets a summary of the current configuration
   *
   * @returns Configuration summary string
   */
  public getConfigSummary(): string {
    return `
Max connections per IP: ${this.config.websocket.maxConnectionsPerIP}
Max calls per hour per IP: ${this.config.websocket.maxCallsPerHour}
Global concurrent connection limit: ${
      this.config.websocket.maxGlobalConcurrentConnections
    }
Global concurrent call limit: ${this.config.websocket.maxGlobalConcurrentCalls}
Max session duration: ${Math.round(
      this.config.websocket.maxSessionDuration / 60000
    )} minutes
Progressive delays: ${
      this.config.penalties.progressiveDelay ? "enabled" : "disabled"
    }
    `.trim();
  }

  /**
   * Resets rate limiting data for a specific IP address
   *
   * @param ipAddress - IP address to reset
   */
  public resetLimitsForIP(ipAddress: string): void {
    this.connectionCache.del(ipAddress);
    this.callCache.del(ipAddress);
    this.phoneCache.del(ipAddress);
    this.violationCache.del(ipAddress);

    if (this.config.monitoring.enableDetailedLogging) {
      console.log(`🔄 Rate limits reset for IP: ${ipAddress}`);
    }
  }

  /**
   * Starts the periodic cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.monitoring.cleanupInterval);
  }

  /**
   * Performs cleanup of expired entries and updates metrics
   */
  private performCleanup(): void {
    // Update suspended IPs count
    let suspendedCount = 0;
    const violationKeys = this.violationCache.keys();

    for (const key of violationKeys) {
      const violation = this.violationCache.get<ViolationEntry>(key);
      if (violation?.suspendedUntil && violation.suspendedUntil > Date.now()) {
        suspendedCount++;
      }
    }

    this.metrics.suspendedIPs = suspendedCount;

    if (this.config.monitoring.enableDetailedLogging) {
      console.log("🧹 Rate limiting cleanup completed", {
        activeConnections: this.metrics.activeConnections,
        activeCalls: this.metrics.activeCalls,
        suspendedIPs: this.metrics.suspendedIPs,
      });
    }
  }

  /**
   * Gracefully shuts down the rate limiting service
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.connectionCache.flushAll();
    this.callCache.flushAll();
    this.phoneCache.flushAll();
    this.violationCache.flushAll();

    console.log("🛡️  Rate limiting service shut down");
  }
}
