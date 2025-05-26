---
sidebar_position: 1
---

# Welcome to AI Phone Screen

**AI Phone Screen** is an open-source starter project for building AI-powered calling systems using OpenAI's Realtime API and Twilio.

## 🎯 What You Can Build

This starter gives you everything needed to create:

- **AI Interview Practice Systems** - Mock phone interviews with AI
- **Customer Service Bots** - Automated phone support agents  
- **Appointment Schedulers** - AI agents that handle booking calls
- **Survey & Feedback Systems** - Automated phone surveys
- **Lead Qualification** - AI agents for sales calls

## 🏗️ Architecture

The system consists of two main components:

- **📱 Web App** (Next.js) - Frontend for call management and configuration
- **🔌 WebSocket Server** (Express) - Handles Twilio ↔ OpenAI Realtime API connection

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Twilio Account
- OpenAI API Key
- PostgreSQL Database (via Neon)

### 1. Clone & Install

```bash
git clone https://github.com/acedit-ai/phone-screen.git
cd phone-screen

# Install webapp dependencies
cd webapp && npm install

# Install websocket server dependencies  
cd ../websocket-server && npm install
```

### 2. Environment Setup

Set up your environment variables for both the webapp and websocket server. Detailed setup instructions will be available in the Environment Setup guide.

### 3. Start Development

```bash
# Terminal 1: Start webapp
cd webapp && npm run dev

# Terminal 2: Start websocket server
cd websocket-server && npm run dev

# Terminal 3: Start ngrok tunnel
ngrok http 8081
```

Your AI calling system will be running at `http://localhost:3000`!

## 📚 What's Next?

- **Environment Setup** - Configure your API keys and database
- **Architecture Overview** - Understand how the system works
- **Customization Guide** - Adapt the AI for your use case
- **Deployment** - Deploy to production

## 🌟 Features

✅ **Multi-Region Support** - US, Australia, India phone numbers  
✅ **Real-time AI Conversations** - OpenAI Realtime API integration  
✅ **Call Transcripts** - Complete conversation logs  
✅ **Function Calling** - AI can execute custom actions  
✅ **Rate Limiting** - Built-in abuse protection  
✅ **Human Verification** - Turnstile integration  
✅ **Database Integration** - PostgreSQL with Neon  

## 🤝 Contributing

We welcome contributions! Contributing guidelines will be available soon.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/acedit-ai/phone-screen/blob/main/LICENSE) file for details.
