/**
 * Turnstile Verification Middleware for WebSocket Server
 *
 * This middleware protects endpoints by validating Turnstile tokens
 * from the webapp's verification system.
 *
 * @fileoverview Turnstile verification for WebSocket server endpoints
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from "express";

interface VerificationRequest extends Request {
  verification?: {
    token: string;
    verified: boolean;
    timestamp?: string;
  };
}

export interface TurnstileValidationResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  action?: string;
  cdata?: string;
}

/**
 * Verifies a Turnstile token with Cloudflare's API
 */
async function verifyTurnstileToken(
  token: string,
  remoteIP?: string
): Promise<TurnstileValidationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn(
      "⚠️  TURNSTILE_SECRET_KEY not configured - verification disabled"
    );
    return { success: true }; // Allow in development
  }

  if (!token) {
    return { success: false, error_codes: ["missing-input-response"] };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);

    if (remoteIP) {
      formData.append("remoteip", remoteIP);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.ok) {
      console.error(`Turnstile verification API error: ${response.status}`);
      return { success: false, error_codes: ["network-error"] };
    }

    const result = (await response.json()) as TurnstileValidationResult;
    return result;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return { success: false, error_codes: ["network-error"] };
  }
}

/**
 * Extract client IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return (
    (req.headers["x-real-ip"] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Middleware to require Turnstile verification for protected endpoints
 */
export function requireVerification() {
  return async (
    req: VerificationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Skip verification in development mode if not configured
    if (
      process.env.NODE_ENV === "development" &&
      !process.env.TURNSTILE_SECRET_KEY
    ) {
      console.log("🔓 Development mode - skipping verification");
      return next();
    }

    try {
      // Extract verification token from headers
      const token =
        (req.headers["x-turnstile-token"] as string) ||
        req.headers["authorization"]?.replace("Bearer ", "");

      if (!token) {
        console.warn(
          `🚫 Verification required for ${req.path} - no token provided`
        );
        res.status(401).json({
          error: "Verification required",
          message:
            "You must complete human verification to access this endpoint.",
          code: "verification_required",
        });
        return;
      }

      const clientIP = getClientIP(req);
      console.log(`🔍 Verifying token for ${req.path} from IP: ${clientIP}`);

      // Verify token with Cloudflare
      const verification = await verifyTurnstileToken(token, clientIP);

      if (!verification.success) {
        console.warn(
          `🚫 Verification failed for ${req.path}:`,
          verification.error_codes
        );
        res.status(401).json({
          error: "Verification failed",
          message: "Invalid or expired verification token.",
          code: "verification_failed",
          details: verification.error_codes,
        });
        return;
      }

      // Add verification info to request
      req.verification = {
        token,
        verified: true,
        timestamp: verification.challenge_ts,
      };

      console.log(
        `✅ Verification successful for ${req.path} from IP: ${clientIP}`
      );
      next();
    } catch (error) {
      console.error("Verification middleware error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Verification service temporarily unavailable.",
        code: "verification_error",
      });
    }
  };
}

/**
 * Optional verification middleware - allows access but logs verification status
 */
export function optionalVerification() {
  return async (
    req: VerificationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token =
        (req.headers["x-turnstile-token"] as string) ||
        req.headers["authorization"]?.replace("Bearer ", "");

      if (token) {
        const clientIP = getClientIP(req);
        const verification = await verifyTurnstileToken(token, clientIP);

        req.verification = {
          token,
          verified: verification.success,
          timestamp: verification.challenge_ts,
        };

        if (verification.success) {
          console.log(
            `✅ Verified request to ${req.path} from IP: ${clientIP}`
          );
        } else {
          console.warn(
            `⚠️  Unverified request to ${req.path} from IP: ${clientIP}`
          );
        }
      } else {
        console.log(`📝 Unverified request to ${req.path} - no token`);
      }

      next();
    } catch (error) {
      console.error("Optional verification error:", error);
      next(); // Continue even if verification fails
    }
  };
}
