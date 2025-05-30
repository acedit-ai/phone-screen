import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import {
  formatPhoneNumberForTwilio,
  isValidPhoneNumberServer,
} from "@/lib/phone-utils";
import {
  getRegionFromPhoneNumber,
  SUPPORTED_REGIONS,
  Region,
} from "@/lib/regions";

// Simple rate limiting imports (database-backed phone rate limiting now handled by websocket-server)
import {
  rateLimit,
  RATE_LIMIT_CONFIGS,
  getClientIP,
} from "@/lib/rateLimiting";

// Extend region with server-side phone number
interface ServerRegion extends Region {
  phoneNumber: string;
}

// Get the US number as fallback
const fallbackNumber = process.env.TWILIO_PHONE_NUMBER_US || "";

function getServerRegions(): ServerRegion[] {
  return SUPPORTED_REGIONS.map((region) => {
    let phoneNumber = "";

    switch (region.code) {
      case "US":
        phoneNumber = fallbackNumber;
        break;
      case "AU":
        phoneNumber = process.env.TWILIO_PHONE_NUMBER_AU || fallbackNumber;
        break;
      case "IN":
        phoneNumber = process.env.TWILIO_PHONE_NUMBER_IN || fallbackNumber;
        break;
      default:
        phoneNumber = fallbackNumber;
    }

    return {
      ...region,
      phoneNumber,
    };
  });
}

function getCallFromNumber(toPhoneNumber: string): string {
  const region = getRegionFromPhoneNumber(toPhoneNumber);
  if (!region) {
    throw new Error(
      `Unsupported region for phone number: ${toPhoneNumber}. Supported regions: US, Australia, India`
    );
  }

  const serverRegions = getServerRegions();
  const serverRegion = serverRegions.find((r) => r.code === region.code);
  if (!serverRegion || !serverRegion.phoneNumber) {
    throw new Error(
      `No phone number configured for ${region.name}. Please contact support.`
    );
  }

  // Check if we're using fallback (US number for non-US regions)
  const isUsingFallback =
    region.code !== "US" && serverRegion.phoneNumber === fallbackNumber;

  if (isUsingFallback) {
    console.log(`📞 Using US number as fallback for ${region.name} region`);
  }

  return serverRegion.phoneNumber;
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const websocketServerUrl =
  process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL || "ws://localhost:8081";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // Apply simple rate limiting for call endpoints (IP-based only)
    // Phone-specific rate limiting is now handled by the websocket-server database
    const rateLimitResult = await rateLimit(
      request, 
      RATE_LIMIT_CONFIGS.calls, 
      'outbound_call'
    );

    if (!rateLimitResult.success) {
      console.warn(`🚫 Outbound call IP rate limit exceeded for IP: ${clientIP}`);
      
      return NextResponse.json(
        { 
          error: rateLimitResult.error || "Too many requests. Please try again later.",
          type: 'ip_rate_limit'
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.calls.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          }
        }
      );
    }

    // Parse request body to get phone number
    const { phoneNumber, jobConfiguration } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.calls.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          }
        }
      );
    }

    // Note: Phone-specific rate limiting (2 calls per hour) is now handled by the websocket-server
    // The websocket-server will check the phone rate limit when the call is initiated
    
    console.log(`📞 Outbound call request from ${clientIP} to ${phoneNumber} (IP: ${rateLimitResult.remaining} calls remaining)`);

    // Validate Twilio configuration
    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Twilio configuration missing" },
        { 
          status: 500,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.calls.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          }
        }
      );
    }

    // Validate phone number format
    if (!isValidPhoneNumberServer(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.calls.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          }
        }
      );
    }

    // Check if the phone number is from a supported region
    const region = getRegionFromPhoneNumber(phoneNumber);
    if (!region) {
      return NextResponse.json(
        {
          error:
            "Unsupported region. We currently support calls to the United States, Australia, and India only.",
          supportedRegions: SUPPORTED_REGIONS.map((r) => ({
            code: r.code,
            name: r.name,
            countryCode: r.countryCode,
          })),
        },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.calls.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          }
        }
      );
    }

    // Get the appropriate local phone number for this region
    let fromPhoneNumber: string;
    try {
      fromPhoneNumber = getCallFromNumber(phoneNumber);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.calls.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          }
        }
      );
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Format phone number for Twilio
    const formattedPhoneNumber = formatPhoneNumberForTwilio(phoneNumber);

    // Use the websocket server's TwiML endpoint (publicly accessible via ngrok)
    const twimlUrl = new URL(
      "/twiml",
      websocketServerUrl.replace(/^ws/, "http")
    );

    // Add job configuration as query parameters if provided
    if (jobConfiguration) {
      twimlUrl.searchParams.set("jobTitle", jobConfiguration.jobTitle || "");
      twimlUrl.searchParams.set("company", jobConfiguration.company || "");
      twimlUrl.searchParams.set(
        "jobDescription",
        jobConfiguration.jobDescription || ""
      );
      twimlUrl.searchParams.set("voice", jobConfiguration.voice || "ash");
    }

    console.log(
      `📞 Making call from ${fromPhoneNumber} (${region.name}) to ${formattedPhoneNumber} for IP ${clientIP}`
    );
    if (jobConfiguration) {
      console.log(
        `📋 Job configuration: ${jobConfiguration.jobTitle} at ${jobConfiguration.company}`
      );
    }

    // Make outbound call using the appropriate regional number
    const call = await client.calls.create({
      to: formattedPhoneNumber,
      from: fromPhoneNumber,
      url: twimlUrl.toString(),
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      region: region.name,
      fromNumber: fromPhoneNumber,
    }, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.calls.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
      }
    });
  } catch (error: any) {
    console.error(`Error making outbound call for IP ${clientIP}:`, error);
    let errorMessage = "Failed to initiate call";
    let statusCode = 500;

    // Provide more specific error messages based on the error type
    if (error.name === "RestException" && error.code) {
      errorMessage = `Twilio error: ${error.message} (code: ${error.code})`;
    } else if (error.message && error.message.includes("Unsupported region")) {
      errorMessage = error.message;
      statusCode = 400;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
