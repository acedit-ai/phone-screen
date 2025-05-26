---
sidebar_position: 2
---

# Quick Start Guide

Get your AI Phone Screen system running in under 10 minutes!

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed
- **Twilio Account** ([Sign up free](https://www.twilio.com/try-twilio))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- **PostgreSQL Database** (we recommend [Neon](https://neon.tech/) for easy setup)

## Step 1: Clone and Install

```bash
git clone https://github.com/acedit-ai/phone-screen.git
cd phone-screen

# Install webapp dependencies
cd webapp && npm install

# Install websocket server dependencies  
cd ../websocket-server && npm install
```

## Step 2: Environment Setup

### Webapp Environment (`.env.development.local`)

Create `webapp/.env.development.local`:

```bash
# Database
DATABASE_URL="postgresql://username:password@host/database"

# Rate Limiting
UPSTASH_REDIS_REST_URL="your_upstash_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_token"

# Human Verification
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_turnstile_site_key"
TURNSTILE_SECRET_KEY="your_turnstile_secret_key"
```

### WebSocket Server Environment (`.env`)

Create `websocket-server/.env`:

```bash
# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Twilio
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
```

## Step 3: Database Setup

```bash
cd webapp
npx prisma generate
npx prisma db push
```

## Step 4: Start Development Servers

Open **3 terminal windows**:

### Terminal 1: Webapp
```bash
cd webapp
npm run dev
```
Your webapp will be at `http://localhost:3000`

### Terminal 2: WebSocket Server
```bash
cd websocket-server
npm run dev
```
WebSocket server will be at `ws://localhost:8081`

### Terminal 3: Ngrok Tunnel
```bash
ngrok http 8081
```
Copy the `https://` URL for Twilio webhook configuration

## Step 5: Configure Twilio Webhook

1. Go to your [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number
4. Set the webhook URL to: `https://your-ngrok-url.ngrok.io/incoming-call`
5. Set HTTP method to **POST**
6. Save configuration

## Step 6: Test Your Setup

1. Visit `http://localhost:3000`
2. Fill in a job description
3. Enter your phone number
4. Click "Start Interview"
5. Answer your phone and start practicing!

## 🎉 Success!

Your AI Phone Screen system is now running! The AI will:

- Ask relevant questions based on the job description
- Conduct a natural conversation
- Provide a transcript when the call ends

## What's Next?

- **Customize the AI**: Edit the prompts in `websocket-server/src/ai-prompt.js`
- **Add Questions**: Modify the interview flow in the WebSocket server
- **Deploy**: Follow our production deployment guide
- **Scale**: Add multiple phone numbers and regions

## Troubleshooting

### Common Issues

**"WebSocket connection failed"**
- Make sure the WebSocket server is running on port 8081
- Check that ngrok is forwarding to the correct port

**"Twilio webhook not receiving calls"**
- Verify your ngrok URL is correct in Twilio console
- Make sure ngrok is still running (it times out after 2 hours on free plan)

**"OpenAI API errors"**
- Check your API key is valid and has sufficient credits
- Ensure you have access to the Realtime API (currently in beta)

Need help? Check our [Troubleshooting Guide](/troubleshooting) or [open an issue](https://github.com/acedit-ai/phone-screen/issues). 