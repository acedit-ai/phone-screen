/**
 * Cloudflare Turnstile Verification Utilities
 * 
 * This module provides server-side verification of Turnstile tokens
 * with Cloudflare's verification API.
 * 
 * @fileoverview Turnstile token verification for bot protection
 * @version 1.0.0
 */

export interface TurnstileValidationResult {
  /** Whether the verification was successful */
  success: boolean;
  /** Timestamp of the challenge completion */
  challenge_ts?: string;
  /** Hostname where the challenge was solved */
  hostname?: string;
  /** Error codes if verification failed */
  error_codes?: string[];
  /** Action name (if configured) */
  action?: string;
  /** Custom data (if configured) */
  cdata?: string;
}

/**
 * Verifies a Turnstile token with Cloudflare's siteverify API
 * 
 * @param token - The Turnstile response token from the client
 * @param remoteIP - Optional IP address of the client
 * @returns Promise resolving to verification result
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIP?: string
): Promise<TurnstileValidationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY environment variable is not set');
    throw new Error('Turnstile secret key not configured');
  }

  if (!token) {
    return { 
      success: false, 
      error_codes: ['missing-input-response'] 
    };
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    
    if (remoteIP) {
      formData.append('remoteip', remoteIP);
    }

    console.log(`🔍 Verifying Turnstile token for IP: ${remoteIP || 'unknown'}`);

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'TwilioRealtimeApp/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error(`Turnstile API returned ${response.status}: ${response.statusText}`);
      return { 
        success: false, 
        error_codes: ['network-error'] 
      };
    }

    const result: TurnstileValidationResult = await response.json();
    
    if (result.success) {
      console.log(`✅ Turnstile verification successful for IP: ${remoteIP || 'unknown'}`);
    } else {
      console.warn(`🚫 Turnstile verification failed for IP: ${remoteIP || 'unknown'}`, result.error_codes);
    }

    return result;
  } catch (error) {
    console.error('Turnstile verification network error:', error);
    return { 
      success: false, 
      error_codes: ['network-error'] 
    };
  }
}

/**
 * Gets a human-readable error message for Turnstile error codes
 * 
 * @param errorCodes - Array of error codes from verification result
 * @returns User-friendly error message
 */
export function getTurnstileErrorMessage(errorCodes?: string[]): string {
  if (!errorCodes || errorCodes.length === 0) {
    return 'Verification failed. Please try again.';
  }

  const errorCode = errorCodes[0];
  
  switch (errorCode) {
    case 'missing-input-secret':
      return 'Server configuration error. Please contact support.';
    case 'invalid-input-secret':
      return 'Server configuration error. Please contact support.';
    case 'missing-input-response':
      return 'Verification token is missing. Please complete the challenge.';
    case 'invalid-input-response':
      return 'Verification failed. Please try again.';
    case 'bad-request':
      return 'Invalid verification request. Please refresh and try again.';
    case 'timeout-or-duplicate':
      return 'Verification expired or already used. Please try again.';
    case 'internal-error':
      return 'Verification service temporarily unavailable. Please try again.';
    case 'network-error':
      return 'Network error during verification. Please check your connection.';
    default:
      return 'Verification failed. Please try again.';
  }
} 