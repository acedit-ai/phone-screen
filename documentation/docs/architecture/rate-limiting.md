---
sidebar_position: 2
---

# Rate Limiting & Graceful Message Delivery

This document explains the rate limiting system and how it ensures users receive polite, professional messages when reaching their free call limits.

## Overview

The rate limiting feature ensures that when users reach their free call limits, the AI agent delivers a polite, professional message explaining the situation before ending the call, rather than abruptly disconnecting them.

## How It Works

### 1. Rate Limit Detection
When a user attempts to make a call that would exceed their rate limits:
- The system detects the rate limit violation in the websocket server
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

## Rate Limit Configuration

The system supports multiple types of rate limiting:

### Default Limits
```env
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window
RATE_LIMIT_MAX_CALLS=5               # Max calls per user
RATE_LIMIT_MAX_CONCURRENT_CALLS=3    # Max concurrent calls
RATE_LIMIT_SESSION_DURATION=1800000  # 30 minutes in milliseconds
RATE_LIMIT_SUSPENSION_DURATION=3600000 # 1 hour in milliseconds
```

### Types of Rate Limiting

#### IP-Based Limits
- **Call frequency**: Maximum calls per hour/day per IP address
- **Request frequency**: Maximum API requests per time window
- **Concurrent connections**: Maximum simultaneous calls

#### Phone Number Limits
- **Per phone number**: Maximum calls to a specific number per time period
- Prevents abuse of repeatedly calling the same number

#### Session Limits
- **Session duration**: Maximum length of a single call session
- **Suspension**: Temporary suspension after violations

## Rate Limit Message Template

The AI agent uses this template for rate-limited calls:

```
"Hello! Thank you for calling our interview screening service. I need to let you know that you've reached your free call limit. This helps us ensure fair access for all users. Thank you for your understanding, and have a great day!"
```

## Implementation Details

### Frontend Rate Limit Handling

When a rate limit is encountered:

```typescript
// Rate limit error response
{
  "error": "Too many requests. Limit: 3 per 15 minutes",
  "type": "ip_rate_limit"
}

// Phone number specific limit
{
  "error": "Too many calls to this number. Limit: 2 per 1 hour(s)",
  "type": "phone_rate_limit",
  "phoneNumber": "+1234567890"
}
```

### WebSocket Server Rate Limiting

The websocket server handles rate-limited calls specially:

```typescript
// Allow rate-limited call for graceful message delivery
if (isRateLimited) {
  console.log('⚠️ Rate limited call allowed to connect for graceful message delivery');
  
  // Set special context for AI
  const rateLimitedInstructions = generateRateLimitInstructions(rateLimitReason);
  
  // Auto-hangup after message delivery
  setTimeout(() => {
    console.log('🚫 Auto-hanging up rate-limited call after message delivery');
    session.hangup();
  }, 15000);
}
```

### Rate Limit Headers

API responses include helpful rate limit information:

```
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1703123456
X-Phone-RateLimit-Remaining: 1
```

## Benefits

1. **Better User Experience**: Users receive a clear explanation instead of an abrupt disconnection
2. **Professional Image**: Maintains a professional tone even when enforcing limits
3. **Clear Communication**: Users understand why the call ended and when they can try again
4. **Abuse Prevention**: Automatic hangup prevents users from staying on the line indefinitely

## Monitoring & Logging

Rate-limited calls are logged with special indicators:

```
⚠️ Rate limited call allowed to connect for graceful message delivery
🚫 Sending rate limit message and preparing to end call
🚫 Auto-hanging up rate-limited call after message delivery
✅ Persistent rate limit check passed for IP: 192.168.1.1
🚫 Phone number rate limit exceeded for +1234567890
```

## Testing Rate Limits

### Manual Testing
1. Make multiple calls quickly to trigger rate limits
2. Verify the AI delivers the rate limit message
3. Confirm the call ends automatically after 15 seconds

### Automated Testing
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
- **Phone number limits**: When calling specific numbers too frequently

Future enhancements could include:
- Phone number specific rate limiting messages
- Customizable message templates
- Different messages for different types of rate limits

## Database Integration

Rate limits are stored persistently in the database to ensure they work across:
- Server restarts
- Multiple deployment instances
- Different server regions

See the [NeonDB Setup Guide](../configuration/neondb-setup) for database configuration details.

## Configuration Examples

### Development Configuration
```env
# More lenient limits for development
RATE_LIMIT_MAX_CALLS=10
RATE_LIMIT_MAX_CONCURRENT_CALLS=5
RATE_LIMIT_WINDOW_MS=600000  # 10 minutes
```

### Production Configuration
```env
# Stricter limits for production
RATE_LIMIT_MAX_CALLS=3
RATE_LIMIT_MAX_CONCURRENT_CALLS=2
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
```

## Troubleshooting

### Rate Limits Not Working
1. Check database connection and schema initialization
2. Verify environment variables are set correctly
3. Check server logs for rate limiting messages

### Graceful Messages Not Delivered
1. Verify the AI is receiving the rate-limited flag
2. Check WebSocket connection for rate-limited calls
3. Ensure auto-hangup timer is working correctly

### Performance Issues
- Rate limiting checks are optimized for minimal latency
- Database queries are indexed for fast lookups
- Automatic cleanup prevents database bloat 