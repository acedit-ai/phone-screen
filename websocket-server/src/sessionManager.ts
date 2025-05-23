import { RawData, WebSocket } from "ws";
import functions from "./functionHandlers";

interface Session {
  id: string; // Unique identifier for this session
  twilioConn?: WebSocket;
  frontendConn?: WebSocket;
  modelConn?: WebSocket;
  streamSid?: string;
  saved_config?: any;
  lastAssistantItem?: string;
  responseStartTimestamp?: number;
  latestMediaTimestamp?: number;
  openAIApiKey?: string;
}

// Map to store multiple sessions, keyed by streamSid (or temporary ID)
const sessions = new Map<string, Session>();

// Generate unique session ID for temporary sessions before streamSid is available
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Find session by WebSocket connection
function findSessionByWebSocket(
  ws: WebSocket,
  type: "twilio" | "frontend" | "model"
): Session | undefined {
  for (const session of sessions.values()) {
    if (type === "twilio" && session.twilioConn === ws) return session;
    if (type === "frontend" && session.frontendConn === ws) return session;
    if (type === "model" && session.modelConn === ws) return session;
  }
  return undefined;
}

export function handleCallConnection(ws: WebSocket, openAIApiKey: string) {
  console.log("🎤 Setting up call connection with OpenAI Realtime API");

  // Create new session with temporary ID
  const sessionId = generateSessionId();
  const session: Session = {
    id: sessionId,
    twilioConn: ws,
    openAIApiKey,
  };

  sessions.set(sessionId, session);
  console.log(`📞 Created new session: ${sessionId}`);

  ws.on("message", (data) => handleTwilioMessage(data, sessionId));
  ws.on("error", (error) => {
    console.error("❌ Call WebSocket error:", error);
    ws.close();
  });
  ws.on("close", () => {
    const session = sessions.get(sessionId);
    if (!session) return;

    console.log(
      `📞 Call connection closed - cleaning up session: ${sessionId}`
    );

    // Notify frontend that call ended BEFORE cleaning up
    if (session.frontendConn) {
      jsonSend(session.frontendConn, {
        type: "call.status_changed",
        status: "ended",
        sessionId: sessionId,
      });
    }

    cleanupConnection(session.modelConn);
    cleanupConnection(session.twilioConn);

    // Remove session from map
    sessions.delete(sessionId);

    // If session was moved to streamSid key, also remove that
    if (session.streamSid && sessions.has(session.streamSid)) {
      sessions.delete(session.streamSid);
    }
  });
}

export function handleFrontendConnection(ws: WebSocket) {
  console.log("🖥️  Setting up frontend connection for logs");

  // For now, associate frontend with the most recent session
  // In a production app, you might want to pass a session ID from the frontend
  const latestSession = Array.from(sessions.values()).pop();
  if (latestSession) {
    cleanupConnection(latestSession.frontendConn);
    latestSession.frontendConn = ws;
    console.log(`🖥️  Frontend connected to session: ${latestSession.id}`);
  }

  ws.on("message", (data) => {
    const session = findSessionByWebSocket(ws, "frontend");
    if (session) {
      handleFrontendMessage(data, session.streamSid || session.id);
    }
  });

  ws.on("close", () => {
    console.log("🖥️  Frontend connection closed");
    const session = findSessionByWebSocket(ws, "frontend");
    if (session) {
      cleanupConnection(session.frontendConn);
      session.frontendConn = undefined;
    }
  });
}

async function handleFunctionCall(item: { name: string; arguments: string }) {
  console.log("Handling function call:", item);
  const fnDef = functions.find((f) => f.schema.name === item.name);
  if (!fnDef) {
    throw new Error(`No handler found for function: ${item.name}`);
  }

  let args: unknown;
  try {
    args = JSON.parse(item.arguments);
  } catch {
    return JSON.stringify({
      error: "Invalid JSON arguments for function call.",
    });
  }

  try {
    console.log("Calling function:", fnDef.schema.name, args);
    const result = await fnDef.handler(args as any);
    return result;
  } catch (err: any) {
    console.error("Error running function:", err);
    return JSON.stringify({
      error: `Error running function ${item.name}: ${err.message}`,
    });
  }
}

function handleTwilioMessage(data: RawData, sessionId: string) {
  const msg = parseMessage(data);
  if (!msg) return;

  const session = sessions.get(sessionId);
  if (!session) {
    console.error(`❌ Session not found: ${sessionId}`);
    return;
  }

  switch (msg.event) {
    case "start":
      console.log("🎬 Call stream started:", msg.start.streamSid);
      session.streamSid = msg.start.streamSid;
      session.latestMediaTimestamp = 0;
      session.lastAssistantItem = undefined;
      session.responseStartTimestamp = undefined;

      // Move session to be keyed by streamSid for easier lookup
      sessions.set(msg.start.streamSid, session);
      if (sessionId !== msg.start.streamSid) {
        sessions.delete(sessionId); // Remove old temporary key
      }

      tryConnectModel(msg.start.streamSid);

      // Notify frontend that call started
      if (session.frontendConn) {
        jsonSend(session.frontendConn, {
          type: "call.status_changed",
          status: "connected",
          sessionId: session.id,
          streamSid: msg.start.streamSid,
        });
      }
      break;

    case "media":
      session.latestMediaTimestamp = msg.media.timestamp;
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, {
          type: "input_audio_buffer.append",
          audio: msg.media.payload,
        });
      }
      break;

    case "close":
      console.log("🎬 Call stream ended");

      // Notify frontend that call ended BEFORE closing connections
      if (session.frontendConn) {
        jsonSend(session.frontendConn, {
          type: "call.status_changed",
          status: "ended",
          sessionId: session.id,
          streamSid: session.streamSid,
        });
      }

      closeAllConnections(session.streamSid || sessionId);
      break;
  }
}

function handleFrontendMessage(data: RawData, sessionKey: string) {
  const msg = parseMessage(data);
  if (!msg) return;

  const session = sessions.get(sessionKey);
  if (!session) return;

  if (isOpen(session.modelConn)) {
    jsonSend(session.modelConn, msg);
  }

  if (msg.type === "session.update") {
    session.saved_config = msg.session;
  }
}

function tryConnectModel(sessionKey: string) {
  const session = sessions.get(sessionKey);
  if (!session) return;

  if (!session.twilioConn || !session.streamSid || !session.openAIApiKey) {
    console.log("⚠️  Missing requirements for OpenAI connection");
    return;
  }
  if (isOpen(session.modelConn)) return;

  console.log(
    `🤖 Connecting to OpenAI Realtime API for session: ${sessionKey}`
  );
  session.modelConn = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
    {
      headers: {
        Authorization: `Bearer ${session.openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  session.modelConn.on("open", () => {
    console.log(
      `✅ Connected to OpenAI Realtime API for session: ${sessionKey}`
    );
    const config = session.saved_config || {};

    // Configure the AI as a phone interview assistant
    const interviewInstructions = `You are a professional AI phone interviewer conducting a technical phone screening. Your role is to:
    
    1. Start the conversation immediately with a warm, professional greeting
    2. Introduce yourself as the AI interviewer for the position
    3. Ask relevant technical and behavioral interview questions
    4. Listen carefully to responses and ask appropriate follow-up questions
    5. Keep the conversation focused on the interview
    6. Be encouraging but professional
    7. The interview should last 10-15 minutes
    
    Begin by greeting the candidate and introducing the purpose of the call. Ask them if they're ready to start the interview, then proceed with your questions.`;

    jsonSend(session.modelConn, {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        turn_detection: { type: "server_vad" },
        voice: "ash",
        input_audio_transcription: { model: "whisper-1" },
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        instructions: interviewInstructions,
        ...config,
      },
    });

    // Send an initial greeting to start the conversation
    setTimeout(() => {
      if (isOpen(session.modelConn)) {
        console.log("🎤 Sending initial greeting to start interview");
        jsonSend(session.modelConn, {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Hello, I just answered the phone. Please start the interview.",
              },
            ],
          },
        });
        jsonSend(session.modelConn, { type: "response.create" });
      }
    }, 1000); // Wait 1 second after connection to ensure everything is set up
  });

  session.modelConn.on("message", (data) =>
    handleModelMessage(data, sessionKey)
  );
  session.modelConn.on("error", (error) => {
    console.error(
      `❌ OpenAI WebSocket error for session ${sessionKey}:`,
      error
    );
    closeModel(sessionKey);
  });
  session.modelConn.on("close", () => {
    console.log(`🤖 OpenAI connection closed for session: ${sessionKey}`);
    closeModel(sessionKey);
  });
}

function handleModelMessage(data: RawData, sessionKey: string) {
  const event = parseMessage(data);
  if (!event) return;

  const session = sessions.get(sessionKey);
  if (!session) return;

  jsonSend(session.frontendConn, event);

  switch (event.type) {
    case "input_audio_buffer.speech_started":
      handleTruncation(sessionKey);
      break;

    case "response.audio.delta":
      if (session.twilioConn && session.streamSid) {
        if (session.responseStartTimestamp === undefined) {
          session.responseStartTimestamp = session.latestMediaTimestamp || 0;
        }
        if (event.item_id) session.lastAssistantItem = event.item_id;

        jsonSend(session.twilioConn, {
          event: "media",
          streamSid: session.streamSid,
          media: { payload: event.delta },
        });

        jsonSend(session.twilioConn, {
          event: "mark",
          streamSid: session.streamSid,
        });
      }
      break;

    case "response.output_item.done": {
      const { item } = event;
      if (item.type === "function_call") {
        handleFunctionCall(item)
          .then((output) => {
            if (session.modelConn) {
              jsonSend(session.modelConn, {
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: item.call_id,
                  output: JSON.stringify(output),
                },
              });
              jsonSend(session.modelConn, { type: "response.create" });
            }
          })
          .catch((err) => {
            console.error("Error handling function call:", err);
          });
      }
      break;
    }
  }
}

function handleTruncation(sessionKey: string) {
  const session = sessions.get(sessionKey);
  if (!session) return;

  if (
    !session.lastAssistantItem ||
    session.responseStartTimestamp === undefined
  )
    return;

  const elapsedMs =
    (session.latestMediaTimestamp || 0) - (session.responseStartTimestamp || 0);
  const audio_end_ms = elapsedMs > 0 ? elapsedMs : 0;

  if (isOpen(session.modelConn)) {
    jsonSend(session.modelConn, {
      type: "conversation.item.truncate",
      item_id: session.lastAssistantItem,
      content_index: 0,
      audio_end_ms,
    });
  }

  if (session.twilioConn && session.streamSid) {
    jsonSend(session.twilioConn, {
      event: "clear",
      streamSid: session.streamSid,
    });
  }

  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
}

function closeModel(sessionKey: string) {
  const session = sessions.get(sessionKey);
  if (!session) return;

  cleanupConnection(session.modelConn);
  session.modelConn = undefined;

  // Only remove session if all connections are closed
  if (!session.twilioConn && !session.frontendConn) {
    sessions.delete(sessionKey);
  }
}

function closeAllConnections(sessionKey: string) {
  const session = sessions.get(sessionKey);
  if (!session) return;

  if (session.twilioConn) {
    session.twilioConn.close();
    session.twilioConn = undefined;
  }
  if (session.modelConn) {
    session.modelConn.close();
    session.modelConn = undefined;
  }
  if (session.frontendConn) {
    session.frontendConn.close();
    session.frontendConn = undefined;
  }

  // Clean up session data
  session.streamSid = undefined;
  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
  session.latestMediaTimestamp = undefined;
  session.saved_config = undefined;

  // Remove session from map
  sessions.delete(sessionKey);
}

function cleanupConnection(ws?: WebSocket) {
  if (isOpen(ws)) ws.close();
}

function parseMessage(data: RawData): any {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

function jsonSend(ws: WebSocket | undefined, obj: unknown) {
  if (!isOpen(ws)) return;
  ws.send(JSON.stringify(obj));
}

function isOpen(ws?: WebSocket): ws is WebSocket {
  return !!ws && ws.readyState === WebSocket.OPEN;
}
