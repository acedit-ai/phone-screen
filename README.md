# AI-Powered Call Practice System

[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/acedit-ai/phone-screen?utm_source=oss&utm_medium=github&utm_campaign=acedit-ai%2Fphone-screen&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai/github/acedit-ai/phone-screen)

A **modular, domain-agnostic** platform for AI-powered phone call simulations. Built with a plugin architecture that makes it easy to create custom call scenarios - from job interviews to customer service training and beyond.

> **🌟 Built on OpenAI's Foundation**: This project extends and enhances the [OpenAI Realtime Twilio Demo](https://github.com/openai/openai-realtime-twilio-demo) with **outbound calling capabilities**, a production-ready plugin architecture, comprehensive documentation, and enterprise features.

![Screenshot 2025-05-23 at 5 46 08 pm](https://github.com/user-attachments/assets/4c6333ad-eadc-4617-927c-7a43901a441d)

## 🎯 What Makes This Special

**🔌 Plugin Architecture**: Easily create new call scenarios without touching core code  
**🌍 Domain Agnostic**: Not just job interviews - build any type of call simulation  
**🚀 Production Ready**: Database-backed rate limiting, real-time UI, multi-region support  
**📱 Real Phone Calls**: Uses Twilio + OpenAI Realtime API for authentic experiences  
**⚡ Real-time Experience**: Instant rate limit feedback and status updates

## 🏗️ Modern Architecture

```
┌─────────────────┐    WebSocket    ┌──────────────────────┐
│     Webapp      │◄──────────────►│   Websocket-Server   │
│   (Frontend)    │    Real-time    │  (Backend + AI)      │
│                 │   Communication │                      │
└─────────────────┘                 └──────────────────────┘
         │                                      │
         │ Simple IP                           │ Database
         │ Rate Limiting                       │ Rate Limiting
         ▼                                     ▼
┌─────────────────┐                 ┌──────────────────────┐
│  In-Memory      │                 │   Fly.io PostgreSQL  │
│     Cache       │                 │      Database        │
└─────────────────┘                 └──────────────────────┘
```

**Key Features:**
- **🔐 Secure Rate Limiting**: 2 calls/hour per phone (database-backed) + 10 calls/15min per IP
- **📱 Real-time UI**: Instant feedback with countdown timers and visual indicators  
- **🛡️ Privacy First**: Phone numbers encrypted with HMAC-SHA256, never stored in plain text
- **⚡ High Performance**: Connection pooling, WebSocket communication, automatic cleanup

## 🎭 Built-in Scenarios

- **💼 Job Interview Practice** - Realistic interview simulations for any role
- **📞 Customer Service Training** - Practice handling customer inquiries
- **🏥 Medical Consultation** - Healthcare communication training
- **🎓 Language Learning** - Conversational practice in different languages

**Want more?** Creating new scenarios takes just minutes with our plugin system!

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Twilio Account with phone numbers
- OpenAI API Key
- PostgreSQL Database (Fly.io recommended)

### 3-Terminal Setup

```bash
# Terminal 1: Start ngrok
ngrok http 8081
# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)

# Terminal 2: Start websocket server  
cd websocket-server
# Add ngrok URL to .env: PUBLIC_URL=https://abc123.ngrok-free.app
# Add database: DATABASE_URL=postgresql://user:pass@host:5432/db
npm install && npm run dev

# Terminal 3: Start webapp
cd webapp  
# Add ngrok URL to .env.local: NEXT_PUBLIC_WEBSOCKET_SERVER_URL=https://abc123.ngrok-free.app
npm install && npm run dev
```

Visit `http://localhost:3000` and start your first call! 📞

## ✨ Latest Features

### 🎯 **Phase 1: Database-Backed Rate Limiting**
- **Persistent Rate Limits**: Survives deployments and restarts
- **Secure Phone Hashing**: HMAC-SHA256 encryption 
- **Fly.io Integration**: Native PostgreSQL with connection pooling
- **Automatic Cleanup**: Old entries cleaned up automatically

### 🎨 **Phase 2: Real-time UI Indicators**  
- **Live Rate Limit Status**: See remaining calls in real-time
- **Visual Countdown Timers**: Know exactly when limits reset
- **Smart Call Prevention**: Blocks calls before they fail
- **WebSocket Communication**: Instant updates without page refresh

### 🔧 **Enhanced Developer Experience**
- **Simplified Architecture**: Clean separation of frontend/backend
- **Better Error Handling**: Graceful fallbacks and clear messages
- **Comprehensive Documentation**: Full guides for setup and deployment
- **Type Safety**: Full TypeScript support throughout

## 🚀 Deployment Options

### Automatic (Recommended)
- **WebSocket Server**: Automatically deploys to Fly.io on push to `main`
- **Web App**: Deploy to Vercel with GitHub integration
- **PR Previews**: Every PR gets its own preview environment

### Manual
```bash
# WebSocket Server (Fly.io)
cd websocket-server && fly deploy

# Web App (Vercel)  
cd webapp && vercel --prod
```

See the [Deployment Guide](https://phone-screen.acedit.ai/documentation/deployment) for complete setup instructions.

## 🆘 Getting Help

- **[Documentation](https://phone-screen.acedit.ai/documentation/)** - Comprehensive guides and tutorials
- **[GitHub Issues](https://github.com/acedit-ai/phone-screen/issues)** - Bug reports and feature requests
- **[GitHub Discussions](https://github.com/acedit-ai/phone-screen/discussions)** - Community support and questions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: This is a starter project designed to be extended. The modular architecture makes it easy to adapt for your specific use case while maintaining production-ready features.
