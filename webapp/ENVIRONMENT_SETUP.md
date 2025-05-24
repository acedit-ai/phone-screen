# Environment Configuration

This document outlines all environment variables used in the phone screen application, covering both the webapp and websocket-server components.

## 📁 File Locations

- **Webapp**: Create a `.env.local` file in the `webapp/` directory
- **WebSocket Server**: Create a `.env` file in the `websocket-server/` directory

## 🔒 Turnstile Verification Setup

The Turnstile verification system is **disabled by default** and can be controlled via environment variables.

### Turnstile Variables (Both Components)

```env
# Enable/Disable Turnstile verification (disabled by default)
NEXT_PUBLIC_TURNSTILE_ENABLED=false

# Cloudflare Turnstile site key (only needed if enabled)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here

# Cloudflare Turnstile secret key (server-side verification)
TURNSTILE_SECRET_KEY=your_secret_key_here
```

### Verification Behavior

1. **Disabled by default**: `NEXT_PUBLIC_TURNSTILE_ENABLED=false` (or not set)
   - Verification is completely bypassed
   - Users can start calls immediately after entering a valid phone number

2. **Development mode**: `NODE_ENV=development`
   - Verification is automatically bypassed regardless of other settings
   - Console log shows "🔓 Verification bypassed: development mode"

3. **Production with verification enabled**: `NEXT_PUBLIC_TURNSTILE_ENABLED=true`
   - Requires valid `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - Shows Turnstile widget after valid phone number entry
   - Requires completion before starting interview

## 📞 Twilio Configuration (Webapp)

```env
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Twilio Phone Numbers (Region-specific)
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890
TWILIO_PHONE_NUMBER_IN=+91234567890

# Webhook URL for Twilio callbacks
TWILIO_WEBHOOK_URL=https://your-domain.com/api/twilio/webhook
```

## 🌐 WebSocket Configuration

```env
# WebSocket server URL (used by webapp to connect)
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8081

# Public URL for the websocket server (if deployed)
PUBLIC_URL=https://your-websocket-server.com
```

## 🤖 AI Configuration (WebSocket Server)

```env
# OpenAI API Key for interview AI
OPENAI_API_KEY=your_openai_api_key
```

## ⚡ WebSocket Server Configuration

```env
# Server port (defaults to 8081)
PORT=8081

# Public URL for server (used for webhooks)
PUBLIC_URL=https://your-domain.com
```

## 🚦 Rate Limiting Configuration (WebSocket Server)

```env
# API rate limiting
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window
RATE_LIMIT_MAX_CALLS=5               # Max calls per user
RATE_LIMIT_MAX_CONCURRENT_CALLS=3    # Max concurrent calls
RATE_LIMIT_SESSION_DURATION=1800000  # 30 minutes in milliseconds
RATE_LIMIT_SUSPENSION_DURATION=3600000 # 1 hour in milliseconds
```

## 📋 Example Configuration Files

### `webapp/.env.local` (Development)
```env
# Turnstile (disabled for development)
NEXT_PUBLIC_TURNSTILE_ENABLED=false

# WebSocket connection
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8081

# Twilio (for production features)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890
TWILIO_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/twilio/webhook
```

### `websocket-server/.env` (Development)
```env
# Server configuration
PORT=8081
PUBLIC_URL=

# AI Integration
OPENAI_API_KEY=your_openai_api_key

# Turnstile (disabled for development)
TURNSTILE_SECRET_KEY=

# Rate limiting (optional - defaults will be used)
RATE_LIMIT_MAX_CALLS=10
RATE_LIMIT_MAX_CONCURRENT_CALLS=5
```

### Production Configuration
For production, ensure all values are properly set:

```env
# webapp/.env.local (Production)
NEXT_PUBLIC_TURNSTILE_ENABLED=true
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_production_site_key
TURNSTILE_SECRET_KEY=your_production_secret_key
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=wss://your-websocket-server.com
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890
TWILIO_PHONE_NUMBER_IN=+91234567890
TWILIO_WEBHOOK_URL=https://your-domain.com/api/twilio/webhook
```

```env
# websocket-server/.env (Production)
PORT=8081
PUBLIC_URL=https://your-websocket-server.com
OPENAI_API_KEY=your_openai_api_key
TURNSTILE_SECRET_KEY=your_production_secret_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_MAX_CALLS=3
RATE_LIMIT_MAX_CONCURRENT_CALLS=2
RATE_LIMIT_SESSION_DURATION=1800000
RATE_LIMIT_SUSPENSION_DURATION=3600000
```

## 🔗 Getting Service Keys

### Cloudflare Turnstile
1. Go to [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
2. Create a site and get your site key and secret key
3. Add them to your environment files
4. Set `NEXT_PUBLIC_TURNSTILE_ENABLED=true` for production

### Twilio
1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token from the console
3. Purchase phone numbers for the regions you support
4. Configure webhook URLs in your Twilio console

### OpenAI
1. Get an API key from [OpenAI](https://platform.openai.com/)
2. Ensure you have sufficient credits/billing set up
3. Add the key to your websocket-server environment

## 🚨 Security Notes

- Never commit `.env` files to version control
- Use different keys for development and production
- Regularly rotate API keys and tokens
- Ensure webhook URLs use HTTPS in production
- Consider using environment variable management services for production deployments 