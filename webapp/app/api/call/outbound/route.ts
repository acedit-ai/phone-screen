import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import {
  formatPhoneNumberForTwilio,
  isValidPhoneNumberServer,
} from "@/lib/phone-utils";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const websocketServerUrl =
  process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL || "ws://localhost:8081";

export async function POST(request: NextRequest) {
  try {
    // Validate Twilio configuration
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return NextResponse.json(
        { error: "Twilio configuration missing" },
        { status: 500 }
      );
    }

    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!isValidPhoneNumberServer(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Format phone number for Twilio
    const formattedPhoneNumber = formatPhoneNumberForTwilio(phoneNumber);

    // Use the websocket server's TwiML endpoint (publicly accessible via ngrok)
    const twimlUrl = new URL("/twiml", websocketServerUrl.replace(/^ws/, "http"));

    // Make outbound call
    const call = await client.calls.create({
      to: formattedPhoneNumber,
      from: twilioPhoneNumber,
      url: twimlUrl.toString(),
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
    });
  } catch (error) {
    console.error("Error making outbound call:", error);
    return NextResponse.json(
      { error: "Failed to initiate call" },
      { status: 500 }
    );
  }
}
