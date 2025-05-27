---
sidebar_position: 2
---

# Environment Setup

This guide covers all environment variables and configuration needed for both the webapp and websocket-server components.

## 📁 File Locations

- **Webapp**: Create a `.env.local` file in the `webapp/` directory
- **WebSocket Server**: Create a `.env` file in the `websocket-server/` directory

## 🚀 Quick Setup for Development

### 1. Webapp Environment (`.env.local`)

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Regional Phone Numbers (E.164 format with + prefix)
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890  # Optional
TWILIO_PHONE_NUMBER_IN=+91234567890  # Optional

# WebSocket Server URL (use your ngrok URL for local development)
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=https://your-unique-id.ngrok-free.app

# Cloudflare Turnstile (optional - disabled by default)
NEXT_PUBLIC_TURNSTILE_ENABLED=false
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here

# Database (for persistent rate limiting)
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
ADMIN_SECRET=your-secure-admin-password
```

### 2. WebSocket Server Environment (`.env`)

```bash
# Server Configuration
PORT=8081
PUBLIC_URL=https://your-unique-id.ngrok-free.app

# AI Integration
OPENAI_API_KEY=your_openai_api_key

# Optional: Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window
RATE_LIMIT_MAX_CALLS=5               # Max calls per user
RATE_LIMIT_MAX_CONCURRENT_CALLS=3    # Max concurrent calls
RATE_LIMIT_SESSION_DURATION=1800000  # 30 minutes
RATE_LIMIT_SUSPENSION_DURATION=3600000 # 1 hour

# Optional: Turnstile (for WebSocket endpoint protection)
TURNSTILE_SECRET_KEY=your_secret_key_here
```

## 🌍 Regional Phone Numbers

### Why Regional Numbers Matter

Using local phone numbers for each region dramatically improves call success rates:

✅ **Higher Connection Rates** - Local numbers less likely to be blocked  
✅ **No International Restrictions** - Bypasses carrier limitations  
✅ **Better Trust** - Recipients more likely to answer local numbers  
✅ **Reduced Costs** - Local rates instead of international fees  
✅ **Compliance** - Meets regional telecommunications regulations  

### Setting Up Regional Numbers

1. **Purchase Numbers in Twilio Console**: https://console.twilio.com/us1/develop/phone-numbers/manage/search

2. **Configure by Region**:
   - **US**: `TWILIO_PHONE_NUMBER_US=+1XXXXXXXXXX` (required)
   - **Australia**: `TWILIO_PHONE_NUMBER_AU=+61XXXXXXXXX` (optional)
   - **India**: `TWILIO_PHONE_NUMBER_IN=+91XXXXXXXXXX` (optional)

3. **Fallback System**: If regional numbers aren't configured, the system uses the US number as fallback

## 🔒 Security Configuration

### Turnstile Bot Protection

Turnstile verification is **disabled by default** and can be controlled via environment variables.

**Behavior by Environment**:
- **Development**: `NODE_ENV=development` - Always bypassed
- **Disabled**: `NEXT_PUBLIC_TURNSTILE_ENABLED=false` (default) - Bypassed  
- **Enabled**: `NEXT_PUBLIC_TURNSTILE_ENABLED=true` - Full verification required

**Getting Turnstile Keys**:
1. Go to [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
2. Create a site and get your site key and secret key
3. Add your domain (include `localhost` for development)

### Database Configuration

For persistent rate limiting across deployments:

1. **Create NeonDB Account**: Go to [neon.tech](https://neon.tech)
2. **Get Connection String**: Copy from your Neon dashboard
3. **Initialize Schema**: Call `/api/admin/init-db` with your admin secret

## 🌐 WebSocket Configuration

### Development Setup

For local development, both components need the **same ngrok URL**:

1. **Start ngrok**: `ngrok http 8081`
2. **Copy URL**: e.g., `https://abc123.ngrok-free.app`
3. **Set in both environments**:
   - `websocket-server/.env`: `PUBLIC_URL=https://abc123.ngrok-free.app`
   - `webapp/.env.local`: `NEXT_PUBLIC_WEBSOCKET_SERVER_URL=https://abc123.ngrok-free.app`

### Production Setup

For production deployments:
- **WebSocket Server**: Use your deployed server URL (e.g., Fly.io)
- **Webapp**: Point to the same production WebSocket server URL

## 🔑 Getting Service Keys

### Twilio Setup
1. Sign up at [Twilio](https://www.twilio.com/)
2. Get Account SID and Auth Token from console
3. Purchase phone numbers for supported regions
4. Configure webhook URLs to point to your server

### OpenAI Setup
1. Get API key from [OpenAI](https://platform.openai.com/)
2. Ensure sufficient credits/billing
3. API key is required for websocket-server

### NeonDB Setup
1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string from dashboard
4. See [NeonDB Setup Guide](../configuration/neondb-setup) for details

## 📋 Example Configurations

### Complete Development Setup

**`webapp/.env.local`**:
```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61987654321

# WebSocket (ngrok URL)
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=https://abc123.ngrok-free.app

# Security (disabled for development)
NEXT_PUBLIC_TURNSTILE_ENABLED=false

# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
ADMIN_SECRET=dev-admin-secret
```

**`websocket-server/.env`**:
```bash
# Server
PORT=8081
PUBLIC_URL=https://abc123.ngrok-free.app

# AI
OPENAI_API_KEY=sk-...

# Rate limiting (optional)
RATE_LIMIT_MAX_CALLS=10
RATE_LIMIT_MAX_CONCURRENT_CALLS=5
```

### Complete Production Setup

**`webapp/.env.local`** (Production):
```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61987654321
TWILIO_PHONE_NUMBER_IN=+91123456789

# WebSocket (production URL)
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=wss://your-app.fly.dev

# Security (enabled for production)
NEXT_PUBLIC_TURNSTILE_ENABLED=true
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAAA...

# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
ADMIN_SECRET=secure-production-secret
```

**`websocket-server/.env`** (Production):
```bash
# Server
PORT=8081
PUBLIC_URL=https://your-app.fly.dev

# AI
OPENAI_API_KEY=sk-...

# Security
TURNSTILE_SECRET_KEY=0x4AAAAAAA...

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_MAX_CALLS=3
RATE_LIMIT_MAX_CONCURRENT_CALLS=2
```

## 🚨 Security Best Practices

- **Never commit** `.env` files to version control
- **Use different keys** for development and production
- **Regularly rotate** API keys and tokens
- **Use HTTPS** for webhook URLs in production
- **Consider environment variable management services** for production deployments
- **Set strong admin secrets** for database initialization

## ❓ Troubleshooting

### Common Issues

**"WebSocket connection failed"**
- Check `NEXT_PUBLIC_WEBSOCKET_SERVER_URL` matches your ngrok URL
- Ensure ngrok is running on port 8081
- Verify both components use the same URL

**"Twilio webhook errors"**
- Ensure `PUBLIC_URL` in websocket-server matches ngrok URL
- Check Twilio webhook configuration
- Verify webhook URL is accessible from internet

**"Database connection failed"**
- Verify `DATABASE_URL` format includes `?sslmode=require`
- Check NeonDB is active (free tier may pause)
- Ensure database schema is initialized

See the [Troubleshooting Guide](../../development/troubleshooting) for more solutions. 