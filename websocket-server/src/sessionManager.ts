import { RawData, WebSocket } from "ws";
import dedent from "dedent";
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
  // Job configuration
  jobTitle?: string;
  company?: string;
  jobDescription?: string;
  voice?: string;
  // Rate limiting context
  isRateLimited?: boolean;
  rateLimitReason?: string;
  // Track initial greeting prompts to filter from transcripts
  initialGreetingPrompts?: Set<string>;
}

// Map to store multiple sessions, keyed by streamSid (or temporary ID)
const sessions = new Map<string, Session>();

// Store frontend connections that are waiting for a call session
const waitingFrontendConnections = new Set<WebSocket>();

// Generate unique session ID for temporary sessions before streamSid is available
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Find session by WebSocket connection
function findSessionByWebSocket(
  ws: WebSocket,
  type: "twilio" | "frontend" | "model"
): Session | undefined {
  for (const [key, session] of sessions.entries()) {
    if (type === "twilio" && session.twilioConn === ws) {
      return session;
    }
    if (type === "frontend" && session.frontendConn === ws) {
      return session;
    }
    if (type === "model" && session.modelConn === ws) {
      return session;
    }
  }

  return undefined;
}

// Find a waiting frontend connection to associate with a new call
function findWaitingFrontendConnection(): WebSocket | undefined {
  const frontendWs = Array.from(waitingFrontendConnections).shift();
  if (frontendWs) {
    waitingFrontendConnections.delete(frontendWs);
    return frontendWs;
  }
  return undefined;
}

// Helper function to convert voice names to proper interviewer names
function getInterviewerName(voice?: string): string {
  if (!voice) return "Ashley"; // Default fallback
  
  // Capitalize first letter and use as name
  const capitalizedVoice = voice.charAt(0).toUpperCase() + voice.slice(1);
  
  // Map voice names to professional interviewer names
  const nameMap: { [key: string]: string } = {
    'Ash': 'Ashley',
    'Ballad': 'Blake',
    'Coral': 'Coral',
    'Sage': 'Sage',
    'Verse': 'Victoria'
  };
  
  return nameMap[capitalizedVoice] || capitalizedVoice;
}

// Helper function to check if a message should be filtered from transcripts
function shouldFilterFromTranscript(event: any, session: Session): boolean {
  // Filter conversation.item.created events for initial greeting prompts
  if (event.type === "conversation.item.created" && event.item?.type === "message" && event.item?.role === "user") {
    const messageText = event.item?.content?.[0]?.text || "";
    
    // Check if this message is in our set of initial greeting prompts
    if (session.initialGreetingPrompts?.has(messageText)) {
      console.log("🚫 Filtering initial greeting prompt from transcript:", messageText.substring(0, 50) + "...");
      return true;
    }
  }
  
  return false;
}

// Helper function to send initial greeting
function sendInitialGreeting(session: Session) {
  if (session.modelConn && isOpen(session.modelConn)) {
    console.log("🎤 Sending initial greeting to start interview");
    
    const greetingText = "Hello, I just answered the phone. Please start the interview.";
    
    // Initialize the set if it doesn't exist
    if (!session.initialGreetingPrompts) {
      session.initialGreetingPrompts = new Set();
    }
    
    // Track this greeting prompt so we can filter it from transcripts
    session.initialGreetingPrompts.add(greetingText);
    
    jsonSend(session.modelConn, {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: greetingText,
          },
        ],
      },
    });
    jsonSend(session.modelConn, { type: "response.create" });
  }
}

export function handleCallConnection(
  ws: WebSocket,
  openAIApiKey: string,
  jobConfig?: {
    jobTitle?: string;
    company?: string;
    jobDescription?: string;
    voice?: string;
    isRateLimited?: boolean;
    rateLimitReason?: string;
  }
) {
  console.log("🎤 Setting up call connection with OpenAI Realtime API");

  // Create new session with temporary ID
  const sessionId = generateSessionId();
  const session: Session = {
    id: sessionId,
    twilioConn: ws,
    openAIApiKey,
    // Set job configuration immediately if provided
    jobTitle: jobConfig?.jobTitle,
    company: jobConfig?.company,
    jobDescription: jobConfig?.jobDescription,
    voice: jobConfig?.voice,
    // Set rate limiting context
    isRateLimited: jobConfig?.isRateLimited,
    rateLimitReason: jobConfig?.rateLimitReason,
    // Initialize set to track initial greeting prompts
    initialGreetingPrompts: new Set(),
  };

  sessions.set(sessionId, session);
  console.log(`📞 Created new session: ${sessionId}`);

  if (jobConfig && (jobConfig.jobTitle || jobConfig.company)) {
    console.log(
      `📋 Session created with job config: ${jobConfig.jobTitle} at ${jobConfig.company}`
    );
  }

  // Try to associate with any waiting frontend connection
  const waitingFrontend = findWaitingFrontendConnection();
  if (waitingFrontend && isOpen(waitingFrontend)) {
    session.frontendConn = waitingFrontend;
    console.log(`🔗 Associated frontend with new call session: ${sessionId}`);
  }

  // Create a wrapper function that dynamically finds the session
  const handleMessage = (data: RawData) => {
    // First try the current session (which might have been moved to streamSid)
    let currentSession = findSessionByWebSocket(ws, "twilio");

    if (!currentSession) {
      console.error(`❌ No session found for Twilio WebSocket`);
      return;
    }

    // Use the current key (either original sessionId or streamSid)
    const currentKey = currentSession.streamSid || currentSession.id;
    handleTwilioMessage(data, currentKey);
  };

  ws.on("message", handleMessage);
  ws.on("error", (error) => {
    console.error("❌ Call WebSocket error:", error);
    ws.close();
  });
  ws.on("close", () => {
    const session = findSessionByWebSocket(ws, "twilio");
    if (!session) return;

    const sessionKey = session.streamSid || session.id;
    console.log(
      `📞 Call connection closed - cleaning up session: ${sessionKey}`
    );

    // Notify frontend that call ended BEFORE cleaning up
    if (session.frontendConn && isOpen(session.frontendConn)) {
      const endMessage = {
        type: "call.status_changed",
        status: "ended",
        sessionId: session.id,
        streamSid: session.streamSid,
      };
      console.log("📤 Notifying frontend of call end:", endMessage);
      jsonSend(session.frontendConn, endMessage);
    }

    // Clean up model connection
    cleanupConnection(session.modelConn);
    cleanupConnection(session.twilioConn);

    // Remove session from both possible keys
    sessions.delete(session.id);
    if (session.streamSid && sessions.has(session.streamSid)) {
      sessions.delete(session.streamSid);
    }

    console.log(`✅ Session cleanup complete: ${sessionKey}`);
  });
}

export function handleFrontendConnection(ws: WebSocket) {
  console.log("🖥️  Setting up frontend connection for logs");

  // Add to waiting connections - will be associated when a call starts
  waitingFrontendConnections.add(ws);
  console.log(
    `🔄 Frontend added to waiting connections (${waitingFrontendConnections.size} waiting)`
  );

  ws.on("message", (data) => {
    handleFrontendMessage(data, ws);
  });

  ws.on("close", () => {
    console.log("🖥️  Frontend connection closed");
    waitingFrontendConnections.delete(ws);
    const session = findSessionByWebSocket(ws, "frontend");
    if (session) {
      console.log(`🧹 Cleaning up frontend connection for session: ${session.streamSid || session.id}`);
      cleanupConnection(session.frontendConn);
      session.frontendConn = undefined;
    }
  });

  ws.on("error", (error) => {
    console.error("🖥️  Frontend WebSocket error:", error);
    waitingFrontendConnections.delete(ws);
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
      // But keep the session object reference intact to preserve frontend connection
      sessions.set(msg.start.streamSid, session);
      if (sessionId !== msg.start.streamSid) {
        sessions.delete(sessionId); // Remove old temporary key
        console.log(
          `🔄 Session moved from ${sessionId} to ${msg.start.streamSid}`
        );
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
        console.log(
          `✅ Frontend notified of session connection: ${msg.start.streamSid}`
        );
      } else {
        console.log(
          `⚠️ No frontend connection found for session: ${msg.start.streamSid}`
        );
        // Try to find any waiting frontend connection and associate it
        const waitingFrontend = findWaitingFrontendConnection();
        if (waitingFrontend && isOpen(waitingFrontend)) {
          session.frontendConn = waitingFrontend;
          console.log(
            `🔗 Late-associated frontend with session: ${msg.start.streamSid}`
          );
          jsonSend(session.frontendConn, {
            type: "call.status_changed",
            status: "connected",
            sessionId: session.id,
            streamSid: msg.start.streamSid,
          });
        }
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
      if (session.frontendConn && isOpen(session.frontendConn)) {
        const endMessage = {
          type: "call.status_changed",
          status: "ended",
          sessionId: session.id,
          streamSid: session.streamSid,
        };
        console.log("📤 Sending call ended notification to frontend:", endMessage);
        jsonSend(session.frontendConn, endMessage);
        
        // Give frontend time to process the message before closing connection
        setTimeout(() => {
          if (session.frontendConn && isOpen(session.frontendConn)) {
            console.log("🔌 Closing frontend connection after call end");
            session.frontendConn.close();
          }
        }, 1000);
      }

      // Clean up the session
      closeAllConnections(session.streamSid || sessionId);
      break;
  }
}

function handleFrontendMessage(data: RawData, ws: WebSocket) {
  const msg = parseMessage(data);
  if (!msg) return;

  let session = findSessionByWebSocket(ws, "frontend");

  // If no session found, try multiple strategies to find the right session
  if (!session) {
    console.log(
      `⚠️ No session found for frontend WebSocket, trying fallback strategies...`
    );

    // Strategy 1: If this is a job configuration, try to find the most recent session
    if (msg.type === "job.configuration") {
      // Find the most recently created session (likely the call session)
      const recentSession = Array.from(sessions.values())
        .sort((a, b) => b.id.localeCompare(a.id))
        .find((s) => s.twilioConn && !s.frontendConn);

      if (recentSession) {
        recentSession.frontendConn = ws;
        waitingFrontendConnections.delete(ws);
        session = recentSession;
        console.log(
          `🔗 Associated frontend with session for job config: ${
            session.streamSid || session.id
          }`
        );
      }
    }

    // Strategy 2: Find any active session without a frontend connection
    if (!session) {
      const activeSession = Array.from(sessions.values()).find(
        (s) => s.twilioConn && isOpen(s.twilioConn) && !s.frontendConn
      );

      if (activeSession) {
        activeSession.frontendConn = ws;
        waitingFrontendConnections.delete(ws);
        session = activeSession;
        console.log(
          `🔗 Late-associated frontend with active session: ${
            activeSession.streamSid || activeSession.id
          }`
        );
      }
    }

    // Strategy 3: Create waiting connection for future association
    if (!session) {
      console.log(
        "📝 Adding frontend to waiting connections for future association"
      );
      waitingFrontendConnections.add(ws);
      return; // Wait for a call session to be created
    }
  }

  if (!session) {
    console.log(
      "❌ Frontend message received but no session could be found or created"
    );
    return;
  }

  console.log(
    `📨 Processing frontend message for session: ${
      session.streamSid || session.id
    }`
  );
  handleFrontendMessageForSession(msg, session);
}

function handleFrontendMessageForSession(msg: any, session: Session) {
  // Handle job configuration
  if (msg.type === "job.configuration") {
    console.log(
      `📋 Received job configuration for session ${
        session.streamSid || session.id
      }:`,
      msg
    );
    
    // Update session with job configuration
    session.jobTitle = msg.jobTitle;
    session.company = msg.company;
    session.jobDescription = msg.jobDescription;
    session.voice = msg.voice;

    // If the session already has an OpenAI connection, update it with the new configuration
    if (session.modelConn && isOpen(session.modelConn)) {
      console.log("🔄 Updating existing OpenAI session with new job configuration");
      
      // Generate updated interview instructions with the new job configuration
      const generateInterviewInstructions = () => {
        // Check if this is a rate-limited call
        if (session.isRateLimited) {
          return dedent`
            You are a professional AI assistant for a phone screening service. The caller has reached their free call limit.

            Your task is to:
            1. Politely greet the caller
            2. Inform them that they have reached their free call limit for the day/hour
            3. Explain that this is to ensure fair usage of the service
            4. Suggest they try again later when their limit resets
            5. Thank them for their interest and politely end the call

            Keep the message brief, professional, and friendly. End the call after delivering this message.

            Example message: "Hello! Thank you for calling our interview screening service. I need to let you know that you've reached your free call limit. This helps us ensure fair access for all users.  Thank you for your understanding, and have a great day!"
          `;
        }

        const jobTitle = session.jobTitle || "this position";
        const company = session.company || "the company";
        const jobDescription = session.jobDescription || "";
        const interviewerName = getInterviewerName(session.voice);

        let baseInstructions = dedent`
          You are ${interviewerName}, a professional AI phone interviewer conducting a technical phone screening. You are interviewing a candidate for the role of ${jobTitle} at ${company}.

          Your role is to:
          1. Start with a warm, professional greeting and introduce yourself by name: "Hello! Thank you for taking the time to speak with me today. My name is ${interviewerName}, and I'm conducting this phone screening for the ${jobTitle} position at ${company}."
          2. Ask if they're ready to begin and if they have any questions before starting
          3. Conduct a comprehensive interview covering:
             - Background and experience relevant to the role
             - Technical skills and knowledge
             - Problem-solving abilities
             - Cultural fit and motivation
             - Questions about their interest in ${company}
          4. Ask thoughtful follow-up questions based on their responses
          5. Keep the conversation focused and professional
          6. The interview should last 10-15 minutes
          7. Be encouraging but thorough in your evaluation

          Interview Guidelines:
          - Ask open-ended questions that allow the candidate to demonstrate their expertise
          - Listen carefully and ask relevant follow-up questions
          - Maintain a professional but friendly tone
          - Cover both technical and behavioral aspects
          - End with asking if they have any questions for you

          Remember: You are ${interviewerName}. Always refer to yourself by this name when introducing yourself or when the candidate asks who they're speaking with.
        `;

        // Add specific job description context if available
        if (jobDescription.trim()) {
          baseInstructions += dedent`

            Job Context:
            ${jobDescription.trim()}

            Use this job description to tailor your questions to the specific requirements and responsibilities mentioned.
          `;
        }

        baseInstructions += dedent`

          Begin by greeting the candidate and introducing yourself as ${interviewerName}, then explain the purpose of the call. Ask them if they're ready to start the interview, then proceed with your questions. Make this feel like a real, professional interview experience.
        `;

        return baseInstructions;
      };

      const updatedInstructions = generateInterviewInstructions();

      // Send complete session update with new voice AND updated instructions
      const sessionUpdate = {
        type: "session.update",
        session: {
          voice: msg.voice || "ash",
          modalities: ["text", "audio"],
          turn_detection: { type: "server_vad" },
          input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
          input_audio_format: "g711_ulaw",
          output_audio_format: "g711_ulaw",
          instructions: updatedInstructions,
          ...session.saved_config,
        },
      };
      
      console.log("📝 Sending updated instructions with job details:", {
        jobTitle: session.jobTitle,
        company: session.company,
        voice: session.voice
      });
      
      jsonSend(session.modelConn, sessionUpdate);
      
      // If this is the first time we're receiving job configuration and the conversation hasn't started,
      // send the initial greeting to start the interview
      if (session.jobTitle && session.company && !session.lastAssistantItem) {
        console.log("🎤 Job configuration received - starting interview");
        setTimeout(() => {
          sendInitialGreeting(session);
        }, 500); // Small delay to ensure the session update is processed first
      }
    }
    
    return;
  }

  // Handle call end request from frontend
  if (msg.type === "call.end") {
    console.log(
      `📞 Received call end request from frontend for session ${
        session.streamSid || session.id
      }`
    );
    
    // Force close the Twilio connection which will trigger the call to end
    if (session.twilioConn && isOpen(session.twilioConn)) {
      console.log("🔌 Forcing Twilio connection close from frontend request");
      session.twilioConn.close(1000, 'Call ended by user');
    }
    
    // Immediately notify frontend that call is ending
    if (session.frontendConn && isOpen(session.frontendConn)) {
      const endMessage = {
        type: "call.status_changed",
        status: "ended",
        sessionId: session.id,
        streamSid: session.streamSid,
        reason: "user_ended"
      };
      console.log("📤 Notifying frontend of user-initiated call end:", endMessage);
      jsonSend(session.frontendConn, endMessage);
    }
    
    return;
  }

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

    // Generate dynamic interview instructions based on job configuration
    const generateInterviewInstructions = () => {
      // Check if this is a rate-limited call
      if (session.isRateLimited) {
        return dedent`
          You are a professional AI assistant for a phone screening service. The caller has reached their free call limit.

          Your task is to:
          1. Politely greet the caller
          2. Inform them that they have reached their free call limit for the day/hour
          3. Explain that this is to ensure fair usage of the service
          4. Suggest they try again later when their limit resets
          5. Thank them for their interest and politely end the call

          Keep the message brief, professional, and friendly. End the call after delivering this message.

          Example message: "Hello! Thank you for calling our interview screening service. I need to let you know that you've reached your free call limit. This helps us ensure fair access for all users.  Thank you for your understanding, and have a great day!"
        `;
      }

      const jobTitle = session.jobTitle || "this position";
      const company = session.company || "the company";
      const jobDescription = session.jobDescription || "";
      const interviewerName = getInterviewerName(session.voice);

      let baseInstructions = dedent`
        You are ${interviewerName}, a professional AI phone interviewer conducting a technical phone screening. You are interviewing a candidate for the role of ${jobTitle} at ${company}.

        Your role is to:
        1. Start with a warm, professional greeting and introduce yourself by name: "Hello! Thank you for taking the time to speak with me today. My name is ${interviewerName}, and I'm conducting this phone screening for the ${jobTitle} position at ${company}."
        2. Ask if they're ready to begin and if they have any questions before starting
        3. Conduct a comprehensive interview covering:
           - Background and experience relevant to the role
           - Technical skills and knowledge
           - Problem-solving abilities
           - Cultural fit and motivation
           - Questions about their interest in ${company}
        4. Ask thoughtful follow-up questions based on their responses
        5. Keep the conversation focused and professional
        6. The interview should last 10-15 minutes
        7. Be encouraging but thorough in your evaluation

        Interview Guidelines:
        - Ask open-ended questions that allow the candidate to demonstrate their expertise
        - Listen carefully and ask relevant follow-up questions
        - Maintain a professional but friendly tone
        - Cover both technical and behavioral aspects
        - End with asking if they have any questions for you

        Remember: You are ${interviewerName}. Always refer to yourself by this name when introducing yourself or when the candidate asks who they're speaking with.
      `;

      // Add specific job description context if available
      if (jobDescription.trim()) {
        baseInstructions += dedent`

          Job Context:
          ${jobDescription.trim()}

          Use this job description to tailor your questions to the specific requirements and responsibilities mentioned.
        `;
      }

      baseInstructions += dedent`

        Begin by greeting the candidate and introducing yourself as ${interviewerName}, then explain the purpose of the call. Ask them if they're ready to start the interview, then proceed with your questions. Make this feel like a real, professional interview experience.
      `;

      return baseInstructions;
    };

    const interviewInstructions = generateInterviewInstructions();

    console.log("📝 Generating initial instructions for session:", {
      sessionKey,
      jobTitle: session.jobTitle,
      company: session.company,
      voice: session.voice,
      hasJobConfig: !!(session.jobTitle && session.company)
    });

    jsonSend(session.modelConn, {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        turn_detection: { type: "server_vad" },
        voice: session.voice || "ash",
        input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        instructions: interviewInstructions,
        ...config,
      },
    });

    // Send an initial greeting to start the conversation
    setTimeout(() => {
      if (isOpen(session.modelConn)) {
        if (session.isRateLimited) {
          console.log("🚫 Sending rate limit message and preparing to end call");
          
          const rateLimitGreetingText = "Hello, I just answered the phone. Please deliver the rate limit message and end the call politely.";
          
          // Track this greeting prompt so we can filter it from transcripts
          if (!session.initialGreetingPrompts) {
            session.initialGreetingPrompts = new Set();
          }
          session.initialGreetingPrompts.add(rateLimitGreetingText);
          
          jsonSend(session.modelConn, {
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: rateLimitGreetingText,
                },
              ],
            },
          });
          jsonSend(session.modelConn, { type: "response.create" });
          
          // For rate-limited calls, automatically hang up after delivering the message
          setTimeout(() => {
            console.log("🚫 Auto-hanging up rate-limited call after message delivery");
            if (session.twilioConn) {
              session.twilioConn.close(1000, 'Rate limit message delivered');
            }
          }, 15000); // Give 15 seconds for the message to be delivered
        } else {
          // For normal calls, only start if we have job configuration
          // Otherwise, wait for job configuration to be received
          if (session.jobTitle && session.company) {
            console.log("🎤 Sending initial greeting to start interview (job config available)");
            sendInitialGreeting(session);
          } else {
            console.log("⏳ Waiting for job configuration before starting interview");
            // The greeting will be sent when job configuration is received
          }
        }
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

  // Filter out initial greeting prompts from transcript
  if (!shouldFilterFromTranscript(event, session)) {
    jsonSend(session.frontendConn, event);
  }

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

/**
 * Reset all session state and cleanup connections
 * Used when starting a new session to ensure clean state
 */
export function resetAllSessions() {
  console.log(`🧹 Resetting all sessions (${sessions.size} active sessions)`);
  
  for (const [sessionKey, session] of sessions.entries()) {
    console.log(`🧹 Cleaning up session: ${sessionKey}`);
    
    // Close all connections
    if (session.twilioConn) {
      cleanupConnection(session.twilioConn);
    }
    if (session.modelConn) {
      cleanupConnection(session.modelConn);
    }
    if (session.frontendConn) {
      cleanupConnection(session.frontendConn);
    }
  }
  
  // Clear all sessions
  sessions.clear();
  
  // Clear waiting frontend connections
  for (const ws of waitingFrontendConnections) {
    cleanupConnection(ws);
  }
  waitingFrontendConnections.clear();
  
  console.log("✅ All sessions reset");
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
