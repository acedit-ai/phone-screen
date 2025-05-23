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

  const twimlContent = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
  console.log("🔗 Generated TwiML with WebSocket URL:", wsUrl.toString());
  res.type("text/xml").send(twimlContent);
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
    if (currentCall) {
      console.log("⚠️  Closing previous call connection");
      currentCall.close();
    }
    currentCall = ws;
    handleCallConnection(currentCall, OPENAI_API_KEY);
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
    console.log("⚠️  PUBLIC_URL not set - make sure to configure for production");
  }
});
