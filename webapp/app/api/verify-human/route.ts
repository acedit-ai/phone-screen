import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstileToken, getTurnstileErrorMessage } from '@/lib/turnstileVerification';
import { getClientIP } from '@/lib/rateLimiting';

/**
 * POST /api/verify-human
 * 
 * Verifies a Cloudflare Turnstile token to confirm the user is human.
 * This endpoint is called during the initial verification process.
 * 
 * If verification is disabled or in development mode, it will bypass verification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    const clientIP = getClientIP(request);

    // Check if verification is enabled
    const isVerificationEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Bypass verification if disabled or in development
    if (!isVerificationEnabled || isDevelopment) {
      console.log(`🔓 Human verification bypassed for IP ${clientIP} - ${!isVerificationEnabled ? 'disabled' : 'development mode'}`);
      
      return NextResponse.json({ 
        success: true,
        verified_at: new Date().toISOString(),
        hostname: 'bypass',
        message: 'Verification bypassed',
        bypassed: true
      });
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ 
        error: 'Verification token is required',
        code: 'missing-token'
      }, { status: 400 });
    }

    // Verify token with Cloudflare
    const verification = await verifyTurnstileToken(token, clientIP);

    if (!verification.success) {
      const errorMessage = getTurnstileErrorMessage(verification.error_codes);
      
      return NextResponse.json({ 
        error: errorMessage,
        code: 'verification-failed',
        details: verification.error_codes 
      }, { status: 400 });
    }

    // Log successful verification for monitoring
    console.log(`✅ Human verification successful for IP ${clientIP} at ${verification.challenge_ts}`);
    
    // Optional: You could store verification in database here for analytics
    // await logVerification(clientIP, verification.challenge_ts);

    return NextResponse.json({ 
      success: true,
      verified_at: verification.challenge_ts,
      hostname: verification.hostname,
      message: 'Verification successful'
    });

  } catch (error) {
    console.error('Verification endpoint error:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error during verification',
      code: 'internal-error'
    }, { status: 500 });
  }
} 