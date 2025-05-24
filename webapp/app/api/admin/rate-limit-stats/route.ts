import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitStats, cleanupOldRateLimits } from '@/lib/database';

/**
 * Admin endpoint to view rate limiting statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Simple authentication check
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.ADMIN_SECRET || 'admin123';
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await getRateLimitStats();
    
    return NextResponse.json({
      success: true,
      statistics: stats,
      description: {
        total_entries: 'Number of active rate limit entries in database',
        total_requests: 'Sum of all request counts across all entries',
        avg_requests_per_key: 'Average requests per IP/identifier',
        max_requests_per_key: 'Maximum requests for any single IP/identifier'
      }
    });
  } catch (error: any) {
    console.error('Failed to get rate limit stats:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get rate limit statistics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Admin endpoint to cleanup old rate limit entries
 */
export async function DELETE(request: NextRequest) {
  try {
    // Simple authentication check
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.ADMIN_SECRET || 'admin123';
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const retentionHours = parseInt(url.searchParams.get('hours') || '24');
    
    const deletedCount = await cleanupOldRateLimits(retentionHours);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} old rate limit entries`,
      retention_hours: retentionHours
    });
  } catch (error: any) {
    console.error('Failed to cleanup rate limits:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to cleanup old rate limit entries',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 