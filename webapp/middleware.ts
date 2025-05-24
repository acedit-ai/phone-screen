import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect API routes with Turnstile verification
 * 
 * This middleware ensures that all API calls (except the verification endpoint)
 * include a valid verification token, preventing unverified access to the service.
 * 
 * Verification is bypassed when disabled via environment variables or in development mode.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip verification for certain paths
  if (
    pathname.startsWith('/api/verify-human') ||  // Allow verification endpoint
    pathname.startsWith('/_next') ||              // Next.js internals
    pathname.startsWith('/favicon') ||            // Static assets
    pathname.includes('.') ||                     // Static files (js, css, images)
    pathname === '/api/health'                    // Health check if you have one
  ) {
    return NextResponse.next();
  }

  // For all other API routes, check for verification token
  if (pathname.startsWith('/api/')) {
    // Check if verification is enabled
    const isVerificationEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Bypass verification if disabled or in development
    if (!isVerificationEnabled || isDevelopment) {
      console.log(`🔓 API access granted (verification bypassed) for ${pathname} - ${!isVerificationEnabled ? 'disabled' : 'development mode'}`);
      return NextResponse.next();
    }

    const verificationToken = request.headers.get('X-Turnstile-Token') || 
                             request.cookies.get('turnstile_verification')?.value;

    if (!verificationToken) {
      console.warn(`🚫 API access denied - no verification token for ${pathname}`);
      
      return NextResponse.json({ 
        error: 'Verification required',
        message: 'You must complete human verification before accessing this service.',
        requiresVerification: true,
        code: 'verification_required'
      }, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    console.log(`✅ API access granted with verification token for ${pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 