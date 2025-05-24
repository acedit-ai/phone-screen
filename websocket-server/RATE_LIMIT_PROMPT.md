# Rate Limit Prompt Feature

## Overview

This feature ensures that when users reach their free call limits, the AI agent delivers a polite, professional message explaining the situation before ending the call, rather than abruptly disconnecting them.

## How It Works

### 1. Rate Limit Detection
When a user attempts to make a call that would exceed their rate limits:
- The system detects the rate limit violation in `server.ts`
- Instead of immediately closing the WebSocket connection, it allows the call to proceed with a special flag
- The call is marked as `isRateLimited: true` with the specific `rateLimitReason`

### 2. AI Prompt Modification
The AI agent receives modified instructions when handling rate-limited calls:
- **Normal calls**: Standard interview prompts
- **Rate-limited calls**: Special prompt to deliver a polite rate limit message

### 3. Message Delivery
For rate-limited calls, the AI agent:
1. Greets the caller professionally
2. Explains they've reached their free call limit
3. Mentions this ensures fair usage for all users
4. Suggests trying again when the limit resets
5. Thanks them and ends the call politely

### 4. Automatic Hangup
- Rate-limited calls automatically end after 15 seconds to prevent abuse
- This ensures the message is delivered but the call doesn't continue indefinitely

## Implementation Details

### Modified Files

#### `websocket-server/src/server.ts`
- Modified WebSocket connection handler to allow rate-limited calls
- Added `isRateLimited` and `rateLimitReason` to job configuration
- Calls are no longer immediately closed when rate limits are exceeded

#### `websocket-server/src/sessionManager.ts`
- Updated `Session` interface to include rate limiting context
- Modified `handleCallConnection` to accept rate limiting parameters
- Enhanced `generateInterviewInstructions` to provide different prompts for rate-limited calls
- Added automatic hangup mechanism for rate-limited calls

### Rate Limit Message Template

The AI agent uses this template for rate-limited calls:

```
"Hello! Thank you for calling our interview screening service. I need to let you know that you've reached your free call limit. This helps us ensure fair access for all users. Thank you for your understanding, and have a great day!"
```

## Configuration

The feature works with existing rate limiting configuration in `rateLimitConfig`:
- Uses the same rate limits defined in the configuration
- Respects all existing rate limiting rules
- No additional configuration required

## Benefits

1. **Better User Experience**: Users receive a clear explanation instead of an abrupt disconnection
2. **Professional Image**: Maintains a professional tone even when enforcing limits
3. **Clear Communication**: Users understand why the call ended and when they can try again
4. **Abuse Prevention**: Automatic hangup prevents users from staying on the line indefinitely

## Testing

Use the provided test script to verify functionality:

```bash
node test-rate-limit-prompt.js
```

This script simulates a rate-limited call and verifies that:
- The connection is established
- The AI delivers the rate limit message
- The call ends automatically

## Rate Limiting Types Supported

Currently supports graceful messaging for:
- **Call frequency limits**: When users exceed calls per hour/day
- **Connection limits**: When too many concurrent connections are attempted

Future enhancements could include:
- Phone number specific rate limiting messages
- Customizable message templates
- Different messages for different types of rate limits

## Monitoring

Rate-limited calls are logged with special indicators:
- `⚠️ Rate limited call allowed to connect for graceful message delivery`
- `🚫 Sending rate limit message and preparing to end call`
- `🚫 Auto-hanging up rate-limited call after message delivery`

This allows for easy monitoring and debugging of the feature. 