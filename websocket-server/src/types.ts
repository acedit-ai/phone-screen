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

// Rate Limiting WebSocket Message Types

/**
 * Message sent from client to check rate limit status for a phone number
 */
export interface RateLimitCheckMessage {
  type: 'rate_limit_check';
  phoneNumber: string;
}

/**
 * Message sent from server with rate limit status
 */
export interface RateLimitStatusMessage {
  type: 'rate_limit_status';
  phoneNumber: string;
  allowed: boolean;
  remaining: number;
  resetTime: number; // timestamp when limit resets
  reason?: string;
}

/**
 * Message sent from server when rate limit is exceeded during a call
 */
export interface RateLimitExceededMessage {
  type: 'rate_limit_exceeded';
  phoneNumber: string;
  reason: string;
  resetTime: number;
}

/**
 * Union type for all WebSocket messages
 */
export type WebSocketMessage = 
  | RateLimitCheckMessage 
  | RateLimitStatusMessage 
  | RateLimitExceededMessage 
  | { type: string; [key: string]: any }; // Allow other message types
