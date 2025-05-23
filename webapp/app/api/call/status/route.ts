import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log('Call Status Update:', {
      callSid,
      callStatus,
      to,
      from,
      timestamp: new Date().toISOString(),
    });

    // Here you could emit this status to connected websocket clients
    // or store it in a database for real-time updates
    
    // For now, we'll just log it
    // In a production app, you might want to:
    // 1. Store the status in a database
    // 2. Emit to websocket clients for real-time UI updates
    // 3. Send notifications to users

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing call status:', error);
    return new NextResponse('Error', { status: 500 });
  }
} 