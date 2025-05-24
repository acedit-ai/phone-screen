import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { makeVerifiedApiCall } from "@/lib/api";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Validate Twilio configuration
    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Twilio configuration missing" },
        { status: 500 }
      );
    }

    const { callSid } = await request.json();

    if (!callSid) {
      return NextResponse.json(
        { error: "Call SID is required" },
        { status: 400 }
      );
    }

    console.log(`📞 Attempting to end call: ${callSid}`);

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    try {
      // End the call by updating its status to 'completed'
      const call = await client.calls(callSid).update({
        status: 'completed'
      });

      console.log(`✅ Call ended successfully: ${callSid} - Status: ${call.status}`);

      return NextResponse.json({
        success: true,
        callSid: call.sid,
        status: call.status,
        message: "Call ended successfully"
      });

    } catch (twilioError: any) {
      console.error(`❌ Twilio error ending call ${callSid}:`, twilioError);
      
      // Handle specific Twilio errors
      if (twilioError.code === 20404) {
        return NextResponse.json(
          { error: "Call not found or already ended", callSid },
          { status: 404 }
        );
      }

      if (twilioError.code === 20003) {
        return NextResponse.json(
          { error: "Authentication failed", callSid },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { 
          error: `Failed to end call: ${twilioError.message}`,
          code: twilioError.code,
          callSid 
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("Error in end call endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 