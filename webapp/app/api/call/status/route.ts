import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

// Get environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Validate the request is from Twilio
    const twilioSignature = request.headers.get("X-Twilio-Signature") || "";
    const url = new URL(request.url).toString();

    // Get raw body as text for validation
    const requestClone = request.clone();
    const rawBody = await requestClone.text();

    // Parse the form data from the raw body
    const params = new URLSearchParams(rawBody);
    const paramObject: Record<string, string> = {};
    params.forEach((value, key) => {
      paramObject[key] = value;
    });

    // Validate the request
    if (
      !twilio.validateRequest(authToken!, twilioSignature, url, paramObject)
    ) {
      console.error("Invalid Twilio signature");
      return new NextResponse("Forbidden", { status: 403 });
    }

    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const to = formData.get("To") as string;
    const from = formData.get("From") as string;

    // Validate required fields
    if (!callSid || !callStatus) {
      return new NextResponse(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Call Status Update:", {
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

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing call status:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
