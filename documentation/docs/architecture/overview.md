---
sidebar_position: 1
---

# Architecture Overview

This document provides a comprehensive overview of the AI-Powered Call Practice System architecture, highlighting the clean separation of concerns and modern design patterns implemented across the platform.

## 🏗️ System Architecture

The platform consists of two main applications with distinct responsibilities:

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    WebSocket    ┌──────────────────────┐   │
│  │     Webapp      │◄──────────────►│   Websocket-Server   │   │
│  │   (Frontend)    │    Real-time    │  (Backend + AI)      │   │
│  │                 │   Communication │                      │   │
│  └─────────────────┘                 └──────────────────────┘   │
│           │                                      │               │
│           │ Simple IP                           │ Database       │
│           │ Rate Limiting                       │ Rate Limiting   │
│           ▼                                     ▼               │
│  ┌─────────────────┐                 ┌──────────────────────┐   │
│  │  In-Memory      │                 │   Fly.io PostgreSQL  │   │
│  │     Cache       │                 │      Database        │   │
│  └─────────────────┘                 └──────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Component Responsibilities

### **Webapp** (Next.js Frontend)
- **User Interface**: Modern, responsive React components
- **Input Validation**: Phone number format and region validation
- **Simple Rate Limiting**: IP-based limits (10 calls per 15 minutes)
- **Real-time UI Updates**: WebSocket communication for status updates
- **Call Initiation**: Twilio API integration for outbound calls

### **Websocket-Server** (Node.js Backend)
- **AI Integration**: OpenAI Realtime API for voice conversations
- **Call Management**: Twilio webhook handling and session management
- **Phone Rate Limiting**: Persistent database-backed limiting (2 calls/hour)
- **WebSocket Server**: Real-time communication with frontend
- **TwiML Generation**: Dynamic call flow generation

### **Database** (Fly.io PostgreSQL)
- **Rate Limiting Storage**: Persistent phone number rate limits
- **Security**: HMAC-SHA256 encrypted phone number hashing
- **Performance**: Connection pooling and automatic cleanup
- **Reliability**: Graceful fallbacks when unavailable

## 🔄 Data Flow

### 1. **User Interaction Flow**
```
User Input → Format Validation → Rate Limit Check → UI Update → Call Decision
```

### 2. **Rate Limiting Flow**
```
Phone Number → Hash Generation → Database Query → WebSocket Response → UI Update
```

### 3. **Call Initiation Flow**
```
Frontend → IP Rate Limit → Twilio API → TwiML URL → Websocket-Server
```

### 4. **Real-time Communication**
```
WebSocket Connection ⟷ Rate Limit Messages ⟷ Status Updates ⟷ UI Changes
```

## 🛡️ Security Architecture

### **Defense in Depth**
1. **Frontend Validation**: Input sanitization and format validation
2. **Rate Limiting**: Multiple layers (IP + Phone) with different windows
3. **Data Encryption**: HMAC-SHA256 for sensitive phone number data
4. **Connection Security**: SSL/TLS for all database and API connections
5. **Environment Isolation**: Separate configs for dev/staging/production

### **Phone Number Privacy**
- Never stored in plain text
- HMAC-SHA256 hashing with configurable secret key
- Automatic cleanup of old rate limit entries
- Zero-knowledge architecture (can't reverse engineer phone numbers)

### **API Security**
- Twilio signature validation for webhooks
- Environment-based configuration
- Rate limiting at multiple levels
- Graceful error handling without information leakage

## 📊 Performance Characteristics

### **Frontend Performance**
- **Real-time Updates**: WebSocket for instant UI feedback
- **Caching**: In-memory rate limit caching
- **Lazy Loading**: Components loaded on demand
- **Bundle Optimization**: Tree-shaking and code splitting

### **Backend Performance**
- **Connection Pooling**: PostgreSQL connection reuse
- **Query Optimization**: Indexed database queries
- **Memory Management**: Automatic cleanup of expired entries
- **Horizontal Scaling**: Stateless design for multiple instances

### **Database Performance**
- **Indexed Queries**: Fast lookups on phone hashes and timestamps
- **Automatic Cleanup**: Background job removes old entries
- **Connection Pooling**: Efficient connection management
- **Query Optimization**: Minimal database calls per request

## 🔧 Technology Stack

### **Frontend (Webapp)**
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **UI Library**: React with custom components
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks and context
- **Communication**: WebSocket for real-time updates

### **Backend (Websocket-Server)**
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript for consistency
- **AI Integration**: OpenAI Realtime API
- **Telephony**: Twilio API and WebRTC
- **WebSocket**: Socket.io for real-time communication
- **Database**: PostgreSQL with connection pooling

### **Infrastructure**
- **Database**: Fly.io native PostgreSQL
- **Deployment**: Fly.io for both applications
- **Development**: Docker for local development
- **Monitoring**: Built-in logging and health checks

## 🌐 Deployment Architecture

### **Development Environment**
```
localhost:3000 (Webapp) ⟷ ws://localhost:8081 (Websocket-Server)
                                     ↓
                            Local PostgreSQL (Optional)
```

### **Production Environment**
```
your-app.vercel.app ⟷ wss://your-server.fly.dev
                             ↓
                    Fly.io PostgreSQL Database
```

## 🔌 Integration Points

### **External Services**
- **Twilio**: Voice calls and phone number management
- **OpenAI**: Realtime API for AI conversations
- **Fly.io**: Database hosting and application deployment
- **Vercel**: Frontend hosting and CDN

### **Internal APIs**
- **Rate Limit Check**: WebSocket messages for real-time status
- **Call Management**: REST APIs for call initiation and control
- **Database**: Direct PostgreSQL queries with connection pooling
- **TwiML**: Dynamic XML generation for Twilio call flows

## 📈 Scalability Considerations

### **Horizontal Scaling**
- **Stateless Design**: No shared state between instances
- **Database Pooling**: Shared connection pools across instances
- **Load Balancing**: Multiple webapp instances supported
- **WebSocket Clustering**: Socket.io Redis adapter ready

### **Vertical Scaling**
- **Connection Pooling**: Efficient database connection usage
- **Memory Management**: Automatic cleanup and garbage collection
- **Query Optimization**: Indexed database operations
- **Caching Strategy**: In-memory caching where appropriate

### **Geographic Scaling**
- **Multi-region Support**: Twilio phone numbers in US, AU, IN
- **Database Replication**: Fly.io regional database support
- **CDN Integration**: Vercel global edge network
- **Latency Optimization**: Regional deployment capabilities

## 🔍 Monitoring & Observability

### **Application Metrics**
- **Rate Limit Statistics**: Call counts and patterns
- **WebSocket Health**: Connection status and message rates
- **Database Performance**: Query times and connection pooling
- **API Response Times**: Twilio and OpenAI integration monitoring

### **Error Handling**
- **Graceful Degradation**: Fallback to in-memory when database unavailable
- **User-Friendly Messages**: Clear error communication
- **Automatic Recovery**: Retry logic for transient failures
- **Logging Strategy**: Structured logging for debugging

### **Health Checks**
- **Database Connectivity**: Regular connection testing
- **External API Status**: Twilio and OpenAI availability
- **WebSocket Status**: Connection health monitoring
- **Rate Limit System**: Verification of proper operation

## 🚀 Future Architecture Considerations

### **Planned Enhancements**
- **Redis Integration**: WebSocket clustering for high availability
- **Metrics Dashboard**: Real-time system monitoring
- **Advanced Analytics**: Call pattern analysis and insights
- **Multi-tenant Support**: Organization-level isolation

### **Potential Integrations**
- **Additional AI Providers**: Anthropic, Google, etc.
- **More Telephony Providers**: Alternative to Twilio
- **Advanced Security**: SAML, LDAP integration
- **International Support**: Additional regional phone numbers

This architecture provides a solid foundation for scaling while maintaining excellent performance, security, and user experience. 