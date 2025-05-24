import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import {
  handleCallConnection,
  handleFrontendConnection,
} from "./sessionManager";
import functions from "./functionHandlers";

// Rate limiting imports
import { createRateLimitConfig, describeRateLimits } from "./config/rateLimiting";
import { RateLimitService } from "./services/rateLimitService";
import {
  createApiRateLimitMiddleware,
  createProgressiveSlowdownMiddleware,
  createCallRateLimitMiddleware,
  addRateLimitHeaders,
  rateLimitErrorHandler,
  rateLimitLoggingMiddleware,
  getClientIP,
} from "./middleware/rateLimitMiddleware";

// Verification middleware import
import { requireVerification, optionalVerification } from "./middleware/verificationMiddleware";

dotenv.config();

const PORT = parseInt(process.env.PORT || "8081", 10);
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

// Initialize rate limiting
const rateLimitConfig = createRateLimitConfig();
const rateLimitService = new RateLimitService(rateLimitConfig);

console.log("🛡️  Rate limiting enabled:");
console.log(describeRateLimits(rateLimitConfig));

const app = express();
app.use(cors());

// Trust proxy if configured (important for rate limiting behind reverse proxies)
if (rateLimitConfig.api.trustProxy) {
  app.set('trust proxy', true);
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.urlencoded({ extended: false }));

// Apply rate limiting middleware
app.use(rateLimitLoggingMiddleware(rateLimitConfig, rateLimitService));
app.use(createProgressiveSlowdownMiddleware(rateLimitConfig));
app.use(createApiRateLimitMiddleware(rateLimitConfig));
app.use(addRateLimitHeaders(rateLimitConfig));

// Health check endpoint (exempted from rate limiting)
app.get("/health", (req, res) => {
  const metrics = rateLimitService.getMetrics();
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    rateLimiting: {
      activeConnections: metrics.activeConnections,
      activeCalls: metrics.activeCalls,
      suspendedIPs: metrics.suspendedIPs,
    }
  });
});

// Metrics endpoint for monitoring
app.get("/metrics", (req, res) => {
  const metrics = rateLimitService.getMetrics();
  res.json({
    rateLimiting: metrics,
    config: {
      maxConnectionsPerIP: rateLimitConfig.websocket.maxConnectionsPerIP,
      maxCallsPerHour: rateLimitConfig.websocket.maxCallsPerHour,
      maxGlobalConcurrentCalls: rateLimitConfig.websocket.maxGlobalConcurrentCalls,
      maxGlobalConcurrentConnections: rateLimitConfig.websocket.maxGlobalConcurrentConnections,
    }
  });
});

app.get("/public-url", (req, res) => {
  res.json({ publicUrl: PUBLIC_URL });
});

// TwiML endpoint for both inbound and outbound calls (with call-specific rate limiting)
app.all("/twiml", 
  optionalVerification(), // Optional verification - log but don't block for compatibility
  createCallRateLimitMiddleware(rateLimitConfig, rateLimitService), 
  (req, res) => {
    console.log("📞 TwiML requested for call");
    const wsUrl = new URL(PUBLIC_URL);
    wsUrl.protocol = "wss:";
    wsUrl.pathname = `/call`;

    // Extract job configuration from query parameters
    const { jobTitle, company, jobDescription, voice } = req.query;
    if (jobTitle || company || jobDescription || voice) {
      console.log(
        `📋 Job config in TwiML: ${jobTitle} at ${company}, voice: ${voice}`
      );
      // URL.searchParams.set() automatically handles URL encoding
      if (jobTitle) wsUrl.searchParams.set("jobTitle", jobTitle as string);
      if (company) wsUrl.searchParams.set("company", company as string);
      if (jobDescription)
        wsUrl.searchParams.set("jobDescription", jobDescription as string);
      if (voice) wsUrl.searchParams.set("voice", voice as string);
    }

    const websocketUrl = wsUrl.toString();
    console.log("🔗 Generated WebSocket URL:", websocketUrl);

    // Escape the URL for XML - replace & with &amp; to fix XML parsing
    const xmlEscapedUrl = websocketUrl.replace(/&/g, "&amp;");

    // Ensure no leading/trailing whitespace and proper XML structure
    const twimlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${xmlEscapedUrl}" />
  </Connect>
</Response>`.trim();

    console.log("📄 Generated TwiML:", twimlContent);

    // Set proper content type and send
    res.set("Content-Type", "text/xml; charset=utf-8");
    res.send(twimlContent);
  }
);

// New endpoint to list available tools (schemas)
app.get("/tools", 
  requireVerification(),
  (req, res) => {
    res.json(functions.map((f) => f.schema));
  }
);

// Add rate limiting error handler
app.use(rateLimitErrorHandler(rateLimitConfig));

let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 1) {
    console.log("❌ WebSocket connection rejected: Invalid path");
    ws.close();
    return;
  }

  const type = parts[0];
  const clientIP = getClientIP(req as any, rateLimitConfig.api.trustProxy);
  
  console.log(`🔌 New WebSocket connection: /${type} from ${clientIP}`);

  // Apply rate limiting for WebSocket connections
  try {
    const connectionCheck = await rateLimitService.checkConnectionLimit(clientIP);
    
    if (!connectionCheck.allowed) {
      console.warn(`🚫 WebSocket connection rejected for ${clientIP}: ${connectionCheck.reason}`);
      ws.close(1008, connectionCheck.reason); // Policy violation close code
      return;
    }

    // Set up connection cleanup on close
    const handleClose = () => {
      rateLimitService.recordConnectionClosed(clientIP);
      if (type === "call") {
        rateLimitService.recordCallEnded(clientIP);
        currentCall = null;
      } else if (type === "logs") {
        currentLogs = null;
      }
    };

    ws.on('close', handleClose);
    ws.on('error', handleClose);

    if (type === "call") {
      // Check call frequency limit before allowing the connection
      const callCheck = await rateLimitService.checkCallFrequencyLimit(clientIP);
      let isRateLimited = false;
      let rateLimitReason = '';
      
      if (!callCheck.allowed) {
        console.warn(`🚫 Call frequency limit exceeded for ${clientIP}: ${callCheck.reason}`);
        // Instead of immediately closing, allow connection but mark it as rate limited
        isRateLimited = true;
        rateLimitReason = callCheck.reason || 'Call frequency limit exceeded';
      }

      console.log("📞 Call connection established - starting audio stream");

      // Extract job configuration from URL parameters
      const jobConfig = {
        jobTitle: url.searchParams.get("jobTitle") || undefined,
        company: url.searchParams.get("company") || undefined,
        jobDescription: url.searchParams.get("jobDescription") || undefined,
        voice: url.searchParams.get("voice") || undefined,
        // Add rate limiting context
        isRateLimited,
        rateLimitReason,
      };

      if (jobConfig.jobTitle || jobConfig.company) {
        console.log(
          `📋 Job configuration from URL: ${jobConfig.jobTitle} at ${jobConfig.company}`
        );
      }

      if (isRateLimited) {
        console.log(`⚠️ Rate limited call allowed to connect for graceful message delivery`);
      }

      // Enforce session duration limit
      const sessionTimeout = setTimeout(() => {
        console.log(`⏰ Session timeout reached for ${clientIP}, closing connection`);
        ws.close(1000, 'Session duration limit exceeded');
      }, rateLimitConfig.websocket.maxSessionDuration);

      // Clear timeout on close
      const originalHandleClose = handleClose;
      const extendedHandleClose = () => {
        clearTimeout(sessionTimeout);
        originalHandleClose();
      };
      
      ws.off('close', handleClose);
      ws.off('error', handleClose);
      ws.on('close', extendedHandleClose);
      ws.on('error', extendedHandleClose);

      if (currentCall) {
        console.log("⚠️  Closing previous call connection");
        currentCall.close();
      }
      currentCall = ws;
      handleCallConnection(currentCall, OPENAI_API_KEY, jobConfig);
    } else if (type === "logs") {
      console.log("📊 Frontend logs connection established");
      if (currentLogs) {
        console.log("⚠️  Closing previous logs connection");
        currentLogs.close();
      }
      currentLogs = ws;
      handleFrontendConnection(currentLogs);
    } else {
      console.log(`❌ Unknown WebSocket type: ${type}`);
      rateLimitService.recordConnectionClosed(clientIP);
      ws.close();
    }
  } catch (error) {
    console.error(`💥 Error handling WebSocket connection from ${clientIP}:`, error);
    ws.close(1011, 'Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on http://localhost:${PORT}`);
  console.log(`📞 TwiML endpoint: http://localhost:${PORT}/twiml`);
  console.log(`🔌 Call WebSocket: ws://localhost:${PORT}/call`);
  console.log(`📊 Logs WebSocket: ws://localhost:${PORT}/logs`);
  console.log(`🛡️  Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  if (PUBLIC_URL) {
    console.log(`🌐 Public URL: ${PUBLIC_URL}`);
  } else {
    console.log(
      "⚠️  PUBLIC_URL not set - make sure to configure for production"
    );
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  rateLimitService.shutdown();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  rateLimitService.shutdown();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
