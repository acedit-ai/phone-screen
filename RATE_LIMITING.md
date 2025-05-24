# Rate Limiting System Documentation

## Overview

This document describes the comprehensive rate limiting system implemented to protect the free Twilio real-time communication service from abuse while maintaining good user experience for legitimate users.

## 🛡️ Architecture

The rate limiting system consists of multiple layers:

### 1. **WebSocket Server Rate Limiting** (`websocket-server/`)
- **Per-IP connection limits**: Max 2 concurrent WebSocket connections per IP
- **Call frequency limits**: Max 5 calls per hour per IP address
- **Global concurrent call limit**: Max 10 simultaneous active calls across all users
- **Session duration limits**: Max 10 minutes per call session
- **Progressive penalties**: Automatic suspension for repeat offenders

### 2. **Next.js API Route Rate Limiting** (`webapp/`)
- **Outbound call endpoint**: Max 3 calls per 15 minutes per IP
- **General API endpoints**: Max 30 requests per 15 minutes per IP
- **Integrated headers**: Rate limit information in response headers

## 📁 File Structure

```
websocket-server/
├── src/
│   ├── config/
│   │   └── rateLimiting.ts          # Configuration and interfaces
│   ├── services/
│   │   └── rateLimitService.ts      # Core rate limiting logic
│   ├── middleware/
│   │   └── rateLimitMiddleware.ts   # Express middleware functions
│   └── server.ts                    # Main server with rate limiting integration

webapp/
├── lib/
│   └── rateLimiting.ts              # Next.js API rate limiting utilities
└── app/api/call/outbound/
    └── route.ts                     # Rate limited API route
```

## ⚙️ Configuration

### Environment Variables

Add these to your `.env` files to customize rate limiting:

```bash
# Rate limiting configuration (optional - defaults will be used if not set)
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=30           # Max requests per window
RATE_LIMIT_MAX_CALLS=3               # Max calls per window
RATE_LIMIT_MAX_CONCURRENT_CALLS=10   # Global concurrent call limit
RATE_LIMIT_MAX_CONCURRENT_CONNECTIONS=10 # Global concurrent connection limit
RATE_LIMIT_SESSION_DURATION=600000   # 10 minutes in milliseconds
RATE_LIMIT_SUSPENSION_DURATION=3600000 # 1 hour suspension
```

### 🔄 Connection vs Call Limits

It's important to understand the distinction between **connections** and **calls**:

- **WebSocket Connections**: Any WebSocket connection to the server (including `/logs` connections for monitoring)
- **Calls**: Active voice calls using the `/call` WebSocket endpoint that consume Twilio resources

This separation allows for:
- Independent monitoring connections (`/logs`) that don't count against call limits
- Separate tuning of connection capacity vs call capacity
- Better resource allocation and clearer billing/usage tracking

| Configuration | Purpose | Applies To |
|---------------|---------|------------|
| `maxGlobalConcurrentConnections` | Total WebSocket connections | All WebSocket endpoints (`/call`, `/logs`) |
| `maxGlobalConcurrentCalls` | Active voice calls | Only `/call` endpoint connections |

### Default Limits

| Component | Limit | Window | Description |
|-----------|-------|--------|-------------|
| **WebSocket Connections** | 2 per IP | Concurrent | Maximum simultaneous WebSocket connections |
| **Call Frequency** | 5 per IP | 1 hour | Maximum calls within the time window |
| **Global Connections** | 10 total | Concurrent | Maximum WebSocket connections across all users |
| **Global Calls** | 10 total | Concurrent | Maximum active calls across all users |
| **Session Duration** | 10 minutes | Per session | Maximum duration for a single call |
| **API Requests** | 30 per IP | 15 minutes | General API endpoint requests |
| **API Calls** | 3 per IP | 15 minutes | Call-specific API requests |

## 🚀 Usage

### WebSocket Server

The rate limiting is automatically applied to all WebSocket connections and API endpoints:

```typescript
// Rate limiting is automatically applied in server.ts
const rateLimitConfig = createRateLimitConfig();
const rateLimitService = new RateLimitService(rateLimitConfig);

// WebSocket connections are checked before establishment
wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  const connectionCheck = await rateLimitService.checkConnectionLimit(clientIP);
  if (!connectionCheck.allowed) {
    ws.close(1008, connectionCheck.reason);
    return;
  }
  // ... connection handling
});
```

### Next.js API Routes

Apply rate limiting to API routes using the utility functions:

```typescript
import { 
  applyRateLimit, 
  RATE_LIMIT_CONFIGS, 
  getRateLimitHeaders,
  createRateLimitErrorResponse 
} from "@/lib/rateLimiting";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(
    request, 
    RATE_LIMIT_CONFIGS.calls, 
    'outbound_call'
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      createRateLimitErrorResponse(rateLimitResult, RATE_LIMIT_CONFIGS.calls),
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult, RATE_LIMIT_CONFIGS.calls)
      }
    );
  }

  // Process the request...
  return NextResponse.json(response, {
    headers: getRateLimitHeaders(rateLimitResult, RATE_LIMIT_CONFIGS.calls)
  });
}
```

## 📊 Monitoring

### Health Check Endpoint

Check the service health and rate limiting status:

```bash
curl http://localhost:8081/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "rateLimiting": {
    "activeConnections": 3,
    "activeCalls": 2,
    "suspendedIPs": 0
  }
}
```

### Metrics Endpoint

Get detailed rate limiting metrics:

```bash
curl http://localhost:8081/metrics
```

Response:
```json
{
  "rateLimiting": {
    "totalRequests": 1250,
    "blockedRequests": 45,
    "activeConnections": 3,
    "activeCalls": 2,
    "suspendedIPs": 0
  },
  "config": {
    "maxConnectionsPerIP": 2,
    "maxCallsPerHour": 5,
    "maxGlobalConcurrentCalls": 10,
    "maxGlobalConcurrentConnections": 10
  }
}
```

### Rate Limit Headers

All API responses include rate limiting information:

```http
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1642248600
X-RateLimit-Policy: 30 requests per 15 minutes
X-Call-Limit-Policy: 3 calls per 15 minutes
```

## 🚫 Rate Limit Responses

When rate limits are exceeded, clients receive a `429 Too Many Requests` response:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 3 per 15 minutes",
  "retryAfter": 654,
  "resetTime": 1642248600000,
  "limit": 3,
  "window": 900
}
```

## 🔧 Advanced Features

### Progressive Penalties

The system implements progressive penalties for repeat offenders:

1. **First violations**: Standard rate limiting
2. **Progressive delays**: Increasing delays for subsequent requests
3. **Temporary suspension**: Automatic suspension after 3 violations
4. **Automatic recovery**: Suspensions automatically expire

### IP Address Detection

The system correctly identifies client IPs behind proxies:

- `X-Forwarded-For` header (supports comma-separated lists)
- `X-Real-IP` header
- `CF-Connecting-IP` header (Cloudflare)
- `X-Client-IP` header
- Express.js IP detection as fallback

### Session Management

WebSocket sessions are automatically managed:

- **Connection tracking**: Per-IP connection counting
- **Session timeouts**: Automatic disconnection after time limits
- **Cleanup on disconnect**: Proper resource cleanup
- **Graceful shutdown**: Clean shutdown handling

## 🛠️ Customization

### Custom Rate Limits

Modify the default configurations in the respective config files:

**WebSocket Server** (`websocket-server/src/config/rateLimiting.ts`):
```typescript
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  websocket: {
    maxConnectionsPerIP: 5,        // Increase to 5 connections
    maxCallsPerHour: 10,           // Increase to 10 calls per hour
    maxGlobalConcurrentConnections: 20, // Increase global connection limit
    maxGlobalConcurrentCalls: 20,  // Increase global call limit
    // ... other settings
  }
  // ... other sections
};
```

**Next.js API** (`webapp/lib/rateLimiting.ts`):
```typescript
export const RATE_LIMIT_CONFIGS = {
  calls: {
    windowSec: 600,    // 10 minutes instead of 15
    maxRequests: 10,   // More general requests
    maxCalls: 5,       // More calls allowed
  }
  // ... other configs
};
```

### Adding Rate Limits to New Endpoints

1. **For WebSocket endpoints**: Rate limiting is automatically applied
2. **For API routes**: Import and use the rate limiting utilities

```typescript
// New API route with rate limiting
export async function POST(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(
    request, 
    RATE_LIMIT_CONFIGS.api,  // Use appropriate config
    'custom_endpoint'        // Custom identifier
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      createRateLimitErrorResponse(rateLimitResult),
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  // ... endpoint logic
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Rate limits too strict**: Adjust environment variables or config files
2. **IP detection issues**: Check proxy configuration and headers
3. **Cache persistence**: Rate limit data is in-memory and resets on restart
4. **Clock synchronization**: Ensure server time is accurate for time-based limits

### Debug Logging

Enable detailed logging by setting environment variables:

```bash
# Enable detailed rate limiting logs
RATE_LIMIT_ENABLE_LOGGING=true
```

### Reset Rate Limits

For development or emergency situations:

```typescript
// Reset limits for specific IP
rateLimitService.resetLimitsForIP('192.168.1.100');

// Or in Next.js
import { resetRateLimit } from '@/lib/rateLimiting';
resetRateLimit('192.168.1.100', 'outbound_call');
```

## 📈 Performance Considerations

- **Memory usage**: Rate limiting data is stored in memory using NodeCache
- **Cleanup**: Automatic cleanup of expired entries
- **Scalability**: For high-scale deployments, consider Redis backend
- **Overhead**: Minimal performance impact (< 1ms per request)

## 🔐 Security Features

- **IP-based tracking**: Prevents abuse from specific sources
- **Multiple violation detection**: Automatic suspension for repeat offenders
- **Session limits**: Prevents long-running connection abuse
- **Global limits**: Protects against coordinated attacks
- **Graceful degradation**: Service remains available even under attack

## 📝 Logging

The system provides comprehensive logging:

```
🛡️  Rate limiting service initialized
📊 Rate limiting configuration loaded: ...
✅ Rate limit check passed for IP 192.168.1.100: 1/3 requests
🚫 Rate limit exceeded for IP 192.168.1.100: 4/3 requests
⚠️  Rate limit violation from 192.168.1.100: call_frequency_exceeded (count: 2)
🚫 IP 192.168.1.100 suspended for 60 minutes due to repeated violations
```

---

## 📞 Support

For issues or questions about the rate limiting system:

1. Check the logs for specific error messages
2. Verify configuration settings
3. Test with the health and metrics endpoints
4. Review the IP detection logic for proxy setups

The rate limiting system is designed to be robust, configurable, and maintainable while providing comprehensive protection for your free service. 