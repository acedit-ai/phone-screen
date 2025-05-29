# OpenAI Realtime + Twilio Voice Application

A Next.js web application that integrates OpenAI's Realtime API with Twilio Voice for AI-powered phone conversations.

## Features

- ✅ **Free AI Phone Calls** - Make outbound calls powered by OpenAI's Realtime API
- ✅ **Multi-Region Support** - US, Australia, and India phone numbers
- ✅ **Real-time Conversations** - Natural voice interactions with AI
- ✅ **Modular Scenario System** - Plugin-based architecture for different call types
- ✅ **Job Interview Practice** - Configure job titles, companies, and descriptions
- ✅ **Scenario Filtering** - Configure which scenarios are shown in the UI
- ✅ **Rate Limiting** - Built-in protection against abuse with configurable limits
- 🆕 **Inline Bot Protection** - Cloudflare Turnstile verification within the call interface
- 🆕 **Session Management** - Secure token-based access control with 30-minute expiry

## Scenario Configuration

### Single Scenario Deployment

For focused deployments (like job interview phone screening), you can configure the UI to show only specific scenarios:

```bash
# Show only job interview scenario
NEXT_PUBLIC_ALLOWED_SCENARIOS=job-interview

# Show multiple specific scenarios
NEXT_PUBLIC_ALLOWED_SCENARIOS=job-interview,customer-service

# Show all scenarios (default behavior)
# NEXT_PUBLIC_ALLOWED_SCENARIOS=
```

When only one scenario is configured:
- The scenario selector dropdown is hidden
- The UI shows a clean, focused interface for that specific use case
- All functionality remains the same, just streamlined for single-purpose deployments

### Available Scenarios

- `job-interview` - Job Interview Practice
- `customer-service` - Customer Service Training  
- `public-speaking` - Public Speaking Practice
- `language-learning` - Language Learning Conversations
- `negotiation-training` - Business Negotiation Training
- `acting-coach` - Acting & Performance Coach

## Security Features

### Rate Limiting
- API endpoint protection (3 calls per 15 minutes per IP)
- Request frequency limiting (30 requests per 15 minutes)
- Configurable via environment variables

### Bot Protection (NEW)
- **Inline verification** using Cloudflare Turnstile within the call interface
- Start interview button disabled until verification is completed
- Token-based session management (30-minute expiry)
- Middleware protection for all API routes

## Environment Variables

Create a `.env.local` file in the webapp directory:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890
TWILIO_PHONE_NUMBER_IN=+91234567890

# WebSocket Server URL (ngrok or production URL)
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=wss://your-ngrok-url.ngrok.io

# Scenario Filtering (Optional)
NEXT_PUBLIC_ALLOWED_SCENARIOS=job-interview

# Cloudflare Turnstile (Bot Protection)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key

# Rate Limiting Configuration (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=30
RATE_LIMIT_MAX_CALLS=3
RATE_LIMIT_MAX_CONCURRENT_CALLS=10
```

### Cloudflare Turnstile Setup

1. **Get Turnstile Keys**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to "Turnstile" in the sidebar
   - Create a new site
   - Copy the **Site Key** and **Secret Key**

2. **Add to Environment**:
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA... # Site Key (public)
   TURNSTILE_SECRET_KEY=0x4AAAAAAA...          # Secret Key (private)
   ```

3. **Configure Domain**:
   - Add your domain(s) in the Turnstile site settings
   - For development, add `localhost` and your ngrok domain

## Installation

1. **Install dependencies**:
   ```bash
   cd webapp
   npm install
   ```

2. **Configure environment variables** (see above)

3. **Start development server**:
   ```bash
   npm run dev
   ```

## How It Works

### User Flow with Inline Verification

1. **App Access**: Users can immediately access the application interface
2. **Job Configuration**: Users fill out job details (title, company, description, voice)
3. **Phone Input**: Enter phone number to enable verification section
4. **Turnstile Challenge**: Complete Cloudflare's bot detection challenge inline
5. **Token Storage**: Verification token stored in session (30-minute expiry)
6. **Interview Start**: "Start Interview" button becomes enabled after verification
7. **API Protection**: All API calls include valid verification tokens

### Security Architecture

```
User → Job Config → Phone Input → Inline Verification → Token Storage → Interview Start
                                           ↓
API Call → Middleware Check → Rate Limiting → Twilio Integration
```

### Verification Interface

The verification now happens inline within the "Start Your Interview" card:

- **Contextual**: Users see verification when they're ready to start
- **Non-blocking**: Can configure job details before verification
- **Clear UX**: Visual indicators show verification status
- **Progressive**: Phone number → Verification → Interview button

## API Endpoints

- `POST /api/verify-human` - Verify Turnstile tokens
- `POST /api/call/outbound` - Start outbound calls (protected)
- All API routes protected by verification middleware

## Development

### Testing Verification

For development without Cloudflare Turnstile:
- The verification section will show a configuration message
- Set both Turnstile environment variables to enable protection

### Rate Limiting Configuration

Adjust limits in environment variables:
```bash
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=30       # Max requests per window
RATE_LIMIT_MAX_CALLS=3          # Max calls per window
```

## Production Deployment

1. **Set up Cloudflare Turnstile** with your production domain
2. **Configure environment variables** in your hosting platform
3. **Deploy with verification enabled** for maximum security

## Monitoring

- Check browser console for verification logs
- Monitor API rate limiting headers
- Review Cloudflare Turnstile analytics

## Troubleshooting

### Verification Issues
- Ensure Turnstile site key is correct and accessible via NEXT_PUBLIC_TURNSTILE_SITE_KEY
- Check domain configuration in Cloudflare (include localhost for development)
- Verify network connectivity to Cloudflare services
- Check browser session storage contains verification tokens

### Button Not Enabling
- Verify both phone number is valid AND verification is completed
- Check browser console for verification success logs
- Ensure session storage contains both 'turnstile_verification' and 'turnstile_timestamp'

### Rate Limiting
- Check `X-RateLimit-*` headers in API responses
- Review rate limiting configuration
- Monitor IP-based tracking logs 