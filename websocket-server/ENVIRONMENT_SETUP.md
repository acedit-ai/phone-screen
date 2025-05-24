# WebSocket Server Environment Configuration

This document outlines all environment variables used in the WebSocket server component of the phone screen application.

## 📁 File Location

Create a `.env` file in the `websocket-server/` directory with the configuration variables below.

## ⚡ Server Configuration

```env
# Server port (defaults to 8081)
PORT=8081

# Public URL for server (used for webhooks and public access)
PUBLIC_URL=https://your-websocket-server.com
```

## 🤖 AI Integration

```env
# OpenAI API Key for interview AI functionality
OPENAI_API_KEY=your_openai_api_key
```

## 🔒 Turnstile Verification

```env
# Cloudflare Turnstile secret key (server-side verification)
# Leave empty or unset to disable verification in development
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

## 📞 Twilio Phone Numbers (Regional Support)

```env
# Twilio phone numbers for different regions
# These should match the numbers configured in your Twilio account
TWILIO_PHONE_NUMBER_US=+1234567890    # US phone number
TWILIO_PHONE_NUMBER_AU=+61234567890   # Australia phone number  
TWILIO_PHONE_NUMBER_IN=+91234567890   # India phone number
```

## 🚦 Rate Limiting Configuration

The WebSocket server includes a comprehensive rate limiting system to protect against abuse. All rate limiting variables are optional and will use sensible defaults if not specified.

### Core Rate Limiting Variables

```env
# Rate limiting window duration
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes in milliseconds

# Maximum API requests per window per IP
RATE_LIMIT_MAX_REQUESTS=30           # Max general requests per window

# Maximum calls per window per IP  
RATE_LIMIT_MAX_CALLS=2               # Max calls per window (reduced from 3)

# Global concurrent call limit (across all users)
RATE_LIMIT_MAX_CONCURRENT_CALLS=10   # Max simultaneous active calls

# Session and suspension durations
RATE_LIMIT_SESSION_DURATION=300000   # 5 minutes per session in milliseconds (reduced from 10 minutes)
RATE_LIMIT_SUSPENSION_DURATION=3600000 # 1 hour suspension in milliseconds

# Phone number rate limiting (NEW)
RATE_LIMIT_PHONE_MAX_CALLS=2         # Max calls per phone number per window
RATE_LIMIT_PHONE_WINDOW_MS=3600000   # Phone number rate limit window (1 hour)
RATE_LIMIT_PHONE_COOLDOWN_MS=1800000 # Cooldown between calls for same number (30 minutes)
```

### Rate Limiting Defaults

If environment variables are not set, these defaults will be used:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 900000 (15 min) | Time window for rate limiting |
| `RATE_LIMIT_MAX_REQUESTS` | 30 | Max API requests per window per IP |
| `RATE_LIMIT_MAX_CALLS` | 2 | Max calls per window per IP (reduced from 3) |
| `RATE_LIMIT_MAX_CONCURRENT_CALLS` | 10 | Global concurrent call limit |
| `RATE_LIMIT_SESSION_DURATION` | 300000 (5 min) | Max session duration (reduced from 10 min) |
| `RATE_LIMIT_SUSPENSION_DURATION` | 3600000 (1 hour) | Suspension duration |
| `RATE_LIMIT_PHONE_MAX_CALLS` | 2 | Max calls per phone number per window |
| `RATE_LIMIT_PHONE_WINDOW_MS` | 3600000 (1 hour) | Phone number rate limit window |
| `RATE_LIMIT_PHONE_COOLDOWN_MS` | 1800000 (30 min) | Cooldown between calls for same number |

### Rate Limiting Features

The system provides multiple layers of protection:

- **Per-IP connection limits**: Max 2 concurrent WebSocket connections per IP
- **Call frequency limits**: Configurable calls per hour per IP address
- **Phone number rate limiting**: Max 2 calls per phone number with cooldown periods
- **Global concurrent call limit**: Configurable simultaneous active calls
- **Session duration limits**: Configurable maximum call duration (5 minutes default)
- **Progressive penalties**: Automatic suspension for repeat offenders
- **IP-based tracking**: Prevents abuse from specific sources

## 📋 Example Configuration Files

### Development Configuration (`.env`)

```env
# Server configuration
PORT=8081
PUBLIC_URL=

# AI Integration
OPENAI_API_KEY=your_openai_api_key

# Turnstile (can be empty for development)
TURNSTILE_SECRET_KEY=

# Twilio phone numbers (if testing regional features)
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890
TWILIO_PHONE_NUMBER_IN=+91234567890

# Rate limiting (optional - more permissive for development)
RATE_LIMIT_MAX_CALLS=2
RATE_LIMIT_MAX_CONCURRENT_CALLS=5
RATE_LIMIT_SESSION_DURATION=600000    # 10 minutes for development

# Phone number rate limiting (for development testing)
RATE_LIMIT_PHONE_MAX_CALLS=3          # More permissive for development
RATE_LIMIT_PHONE_WINDOW_MS=3600000    # 1 hour window
RATE_LIMIT_PHONE_COOLDOWN_MS=900000   # 15 minutes cooldown for development
```

### Production Configuration (`.env`)

```env
# Server configuration
PORT=8081
PUBLIC_URL=https://your-websocket-server.com

# AI Integration
OPENAI_API_KEY=your_production_openai_api_key

# Turnstile verification (required for production)
TURNSTILE_SECRET_KEY=your_production_turnstile_secret_key

# Twilio phone numbers
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890
TWILIO_PHONE_NUMBER_IN=+91234567890

# Rate limiting (restrictive for production)
RATE_LIMIT_MAX_CALLS=2                 # Conservative call limit (reduced from 3)
RATE_LIMIT_MAX_CONCURRENT_CALLS=10     # Global limit
RATE_LIMIT_SESSION_DURATION=300000     # 5 minutes max session (reduced from 10)
RATE_LIMIT_SUSPENSION_DURATION=3600000 # 1 hour suspension

# Phone number rate limiting (restrictive for production)
RATE_LIMIT_PHONE_MAX_CALLS=2           # Strict limit per phone number
RATE_LIMIT_PHONE_WINDOW_MS=3600000     # 1 hour window
RATE_LIMIT_PHONE_COOLDOWN_MS=1800000   # 30 minutes cooldown between calls
```

### High-Traffic Production Configuration

For higher capacity deployments:

```env
# Server configuration
PORT=8081
PUBLIC_URL=https://your-websocket-server.com

# AI Integration
OPENAI_API_KEY=your_production_openai_api_key

# Turnstile verification
TURNSTILE_SECRET_KEY=your_production_turnstile_secret_key

# Twilio phone numbers
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890
TWILIO_PHONE_NUMBER_IN=+91234567890

# Rate limiting (higher capacity)
RATE_LIMIT_WINDOW_MS=900000            # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100            # Higher request limit
RATE_LIMIT_MAX_CALLS=5                 # More calls allowed
RATE_LIMIT_MAX_CONCURRENT_CALLS=25     # Higher global limit
RATE_LIMIT_SESSION_DURATION=900000     # 15 minutes max session
RATE_LIMIT_SUSPENSION_DURATION=1800000 # 30 minutes suspension
```

## 🔗 Getting Service Keys

### OpenAI API Key

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new secret key
4. Ensure you have sufficient credits/billing configured
5. Add the key as `OPENAI_API_KEY`

### Cloudflare Turnstile

1. Go to [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
2. Create a new site
3. Get your secret key (different from site key)
4. Add as `TURNSTILE_SECRET_KEY`

### Twilio Phone Numbers

1. Sign up at [Twilio Console](https://www.twilio.com/console)
2. Purchase phone numbers for supported regions:
   - US: +1 number
   - Australia: +61 number  
   - India: +91 number
3. Note the full international format including country code
4. Add to respective environment variables

## 🚨 Security Best Practices

- **Never commit `.env` files** to version control
- **Use different keys** for development and production environments
- **Regularly rotate API keys** and access tokens
- **Monitor rate limiting logs** for abuse patterns
- **Set appropriate rate limits** based on your service capacity
- **Use HTTPS** for all production PUBLIC_URL values
- **Implement proper logging** and monitoring

## 🔍 Environment Variable Validation

The server validates critical environment variables on startup:

- **OpenAI API Key**: Warns if missing but allows startup
- **Port**: Uses default 8081 if not specified
- **Rate Limiting**: Uses defaults for any missing rate limit variables
- **Turnstile**: Bypasses verification if secret key is missing (development mode)

## 📊 Monitoring and Health Checks

### Health Check Endpoint

The server provides a health check endpoint that includes rate limiting status:

```bash
curl http://localhost:8081/health
```

Response includes rate limiting metrics:
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

Detailed metrics available at:

```bash
curl http://localhost:8081/metrics
```

## 🛠️ Development vs Production

### Development Mode Features

- **Automatic bypass**: Turnstile verification bypassed if `NODE_ENV=development`
- **Permissive rate limits**: Higher limits for easier testing
- **Detailed logging**: More verbose rate limiting logs
- **Quick recovery**: Shorter suspension durations

### Production Mode Features

- **Strict rate limiting**: Lower limits to prevent abuse
- **Required verification**: Turnstile verification required
- **Security headers**: Additional security measures
- **Monitoring integration**: Enhanced metrics and logging

## 📝 Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**: Service starts but AI features won't work
2. **Invalid port**: Check if port is available and not blocked by firewall
3. **Rate limit too strict**: Adjust `RATE_LIMIT_MAX_CALLS` and related variables
4. **Memory issues**: Rate limiting uses in-memory storage, consider Redis for high-scale

### Debug Commands

```bash
# Check environment variables are loaded
npm run dev 2>&1 | grep "Environment"

# Monitor rate limiting in real-time
tail -f logs/rate-limiting.log

# Test health endpoint
curl -v http://localhost:8081/health
```

---

For detailed rate limiting configuration and advanced features, see the [RATE_LIMITING.md](./RATE_LIMITING.md) documentation. 