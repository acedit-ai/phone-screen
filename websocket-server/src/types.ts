import { WebSocket } from "ws";
import { ScenarioSession } from "./scenarios/types";

export interface Session {
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
  // Scenario configuration - replaces job-specific fields
  scenario?: ScenarioSession;
  // Rate limiting context
  isRateLimited?: boolean;
  rateLimitReason?: string;
  // Track initial greeting prompts to filter from transcripts
  initialGreetingPrompts?: Set<string>;
}

export interface FunctionCallItem {
  name: string;
  arguments: string;
  call_id?: string;
}

export interface FunctionSchema {
  name: string;
  type: "function";
  description?: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
}

export interface FunctionHandler {
  schema: FunctionSchema;
  handler: (args: any) => Promise<string>;
}
