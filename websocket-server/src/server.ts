import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import dotenv from "dotenv";
import http from "http";
import { readFileSync } from "fs";
import { join } from "path";
import cors from "cors";
import {
  handleCallConnection,
  handleFrontendConnection,
} from "./sessionManager";
import functions from "./functionHandlers";

dotenv.config();

const PORT = parseInt(process.env.PORT || "8081", 10);
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.urlencoded({ extended: false }));

const twimlPath = join(__dirname, "twiml.xml");
const twimlTemplate = readFileSync(twimlPath, "utf-8");

app.get("/public-url", (req, res) => {
  res.json({ publicUrl: PUBLIC_URL });
});

// TwiML endpoint for both inbound and outbound calls
app.all("/twiml", (req, res) => {
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
});

// New endpoint to list available tools (schemas)
app.get("/tools", (req, res) => {
  res.json(functions.map((f) => f.schema));
});

let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 1) {
    console.log("❌ WebSocket connection rejected: Invalid path");
    ws.close();
    return;
  }

  const type = parts[0];
  console.log(`🔌 New WebSocket connection: /${type}`);

  if (type === "call") {
    console.log("📞 Call connection established - starting audio stream");

    // Extract job configuration from URL parameters
    const jobConfig = {
      jobTitle: url.searchParams.get("jobTitle") || undefined,
      company: url.searchParams.get("company") || undefined,
      jobDescription: url.searchParams.get("jobDescription") || undefined,
      voice: url.searchParams.get("voice") || undefined,
    };

    if (jobConfig.jobTitle || jobConfig.company) {
      console.log(
        `📋 Job configuration from URL: ${jobConfig.jobTitle} at ${jobConfig.company}`
      );
    }

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
    ws.close();
  }
});

server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on http://localhost:${PORT}`);
  console.log(`📞 TwiML endpoint: http://localhost:${PORT}/twiml`);
  console.log(`🔌 Call WebSocket: ws://localhost:${PORT}/call`);
  console.log(`📊 Logs WebSocket: ws://localhost:${PORT}/logs`);
  if (PUBLIC_URL) {
    console.log(`🌐 Public URL: ${PUBLIC_URL}`);
  } else {
    console.log(
      "⚠️  PUBLIC_URL not set - make sure to configure for production"
    );
  }
});
