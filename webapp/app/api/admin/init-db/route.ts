import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/database';

/**
 * Admin endpoint to initialize the database schema
 * This should be called once after setting up NeonDB
 */
export async function POST(request: NextRequest) {
  try {
    // Simple authentication check - you might want to add proper auth
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.ADMIN_SECRET || 'admin123';
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await initializeDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Database schema initialized successfully'
    });
  } catch (error: any) {
    console.error('Failed to initialize database:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initialize database',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database initialization endpoint. Use POST with Bearer token.',
    usage: 'POST /api/admin/init-db with Authorization: Bearer <ADMIN_SECRET>'
  });
} 