---
sidebar_position: 2
---

# Rate Limiting Architecture

This document explains the comprehensive rate limiting system that ensures fair usage across the platform while providing excellent user experience through real-time feedback.

## 🏗️ Architecture Overview

The rate limiting system is now split across two applications with clear responsibilities:

### **Websocket-Server** (Database-Backed)
- **Phone Number Rate Limiting**: Persistent, secure, 2 calls per hour per phone
- **Database Storage**: Fly.io native PostgreSQL with encrypted phone hashes
- **Real-time Communication**: WebSocket messages for UI updates

### **Webapp** (In-Memory)  
- **IP Address Rate Limiting**: Simple, fast, 10 calls per 15 minutes per IP
- **UI Integration**: Real-time visual indicators and status updates
- **User Experience**: Prevents failed calls with immediate feedback

## 🎯 Rate Limiting Rules

### Phone Number Limits (Persistent)
- **Limit**: 2 calls per hour per phone number
- **Window**: Rolling 1-hour window
- **Storage**: PostgreSQL database with secure phone hashing
- **Scope**: Global across all deployments

### IP Address Limits (Session)
- **Limit**: 10 calls per 15 minutes per IP
- **Window**: Sliding 15-minute window  
- **Storage**: In-memory cache (webapp)
- **Scope**: Per webapp instance

## 🔄 Real-Time Communication Flow

### 1. User Input Validation
```
User enters phone number → Frontend validates format → Shows rate limit status
```

### 2. Rate Limit Check
```typescript
// Frontend sends via WebSocket
{
  type: 'rate_limit_check',
  phoneNumber: '+1234567890'
}

// Websocket-server responds with current status
{
  type: 'rate_limit_status',
  phoneNumber: '+1234567890',
  allowed: true,
  remaining: 2,
  resetTime: 1640995200000
}
```

### 3. UI State Updates
The frontend immediately updates the user interface:
- **Green Alert**: "2/2 calls available" 
- **Yellow Alert**: "1/2 calls available - Last call!"
- **Red Alert**: "Call limit reached - Resets in 45m"
- **Button State**: Disabled when rate limited

### 4. Call Attempt Validation
```
User clicks call → Check rate limits → Allow/Block call → Update UI
```

## 🛡️ Security & Privacy

### Phone Number Protection
```typescript
// Phone numbers are never stored in plain text
const phoneHash = hmac('sha256', PHONE_ENCRYPTION_KEY, normalizedPhone);

// Database stores only the hash
CREATE TABLE phone_rate_limits (
  phone_hash VARCHAR(64) PRIMARY KEY,  -- HMAC-SHA256 hash
  call_count INTEGER DEFAULT 0,
  window_start BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Key Security Features
- **HMAC-SHA256 Hashing**: Phone numbers never stored in plain text
- **Configurable Encryption Key**: `PHONE_ENCRYPTION_KEY` environment variable
- **Connection Pooling**: Secure SSL connections to database
- **Graceful Fallbacks**: System works even if database is unavailable

## 🚀 Database Schema

### Phone Rate Limits Table
```sql
CREATE TABLE IF NOT EXISTS phone_rate_limits (
  phone_hash VARCHAR(64) PRIMARY KEY,
  call_count INTEGER NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_rate_limits_window_start 
ON phone_rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_phone_rate_limits_created_at 
ON phone_rate_limits(created_at);
```

### Automatic Cleanup
Old rate limit entries are automatically cleaned up:
```typescript
// Removes entries older than 7 days
await cleanupOldEntries(7 * 24 * 60 * 60 * 1000);
```

## 🎨 UI Integration

### Rate Limit Indicator Component
```typescript
<RateLimitIndicator rateLimitStatus={rateLimitStatus} />
```

**Visual States:**
- **Loading**: Spinner with "Checking rate limit..."
- **Available**: Green with remaining calls badge
- **Warning**: Yellow when 1 call remaining  
- **Blocked**: Red with countdown timer
- **Error**: Yellow with connection error message

### Phone Input Integration
```typescript
const { rateLimitStatus, checkRateLimit } = useRateLimit();

// Automatic checking when phone number changes
useEffect(() => {
  if (isValidPhone && isSupportedRegion) {
    checkRateLimit(phoneNumber);
  }
}, [phoneNumber]);

// Prevent calls when rate limited
const canStartCall = isValidPhone && isVerified && !isRateLimited;
```

## ⚙️ Configuration

### Environment Variables

#### Websocket-Server
```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/db
FLY_DATABASE_URL=postgresql://user:pass@host:5432/db  # Fly.io fallback

# Security
PHONE_ENCRYPTION_KEY=your-32-character-secret-key

# Rate Limiting
RATE_LIMIT_CLEANUP_INTERVAL=3600000  # 1 hour cleanup interval
```

#### Webapp
```bash
# WebSocket Connection
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=wss://your-server.fly.dev

# Simple Rate Limiting (IP-based)
RATE_LIMIT_WINDOW_SEC=900     # 15 minutes
RATE_LIMIT_MAX_REQUESTS=10    # 10 calls per window
```

## 🔍 Monitoring & Analytics

### Database Statistics
```typescript
// Get rate limiting statistics
const stats = await rateLimitDB.getStatistics();
console.log(stats);
// {
//   totalEntries: 1250,
//   entriesLast24h: 89,
//   avgCallsPerEntry: 1.3,
//   topRegions: ['US', 'AU', 'IN']
// }
```

### WebSocket Connection Health
```typescript
// Monitor connection status
const { isConnected } = useRateLimit();
console.log(`WebSocket connected: ${isConnected}`);
```

### Error Tracking
- Database connection failures logged with fallback to in-memory
- WebSocket disconnections handled gracefully with reconnection
- Rate limit check failures show user-friendly error messages

## 🔧 Development & Testing

### Local Development Setup
```bash
# Start PostgreSQL locally (optional - uses in-memory fallback)
docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres

# Set environment variables
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/phone_screen" > .env
echo "PHONE_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env

# Initialize database
npm run db:init
```

### Testing Rate Limits
```bash
# Check current rate limit status
curl -X POST http://localhost:8081/api/rate-limit-check \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# Reset rate limits for testing
curl -X DELETE http://localhost:8081/api/rate-limit-reset \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## 🚨 Troubleshooting

### Common Issues

#### Rate Limit Not Updating
```bash
# Check WebSocket connection
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8081

# Verify database connection
DATABASE_URL=postgresql://user:pass@host:5432/db
```

#### Database Connection Errors
```bash
# System gracefully falls back to in-memory rate limiting
# Check logs for database connection status
```

#### Encryption Key Issues
```bash
# Generate new encryption key
openssl rand -hex 32

# Set in environment
export PHONE_ENCRYPTION_KEY=your-new-key-here
```

### Performance Optimization
- Database connection pooling enabled by default
- Rate limit checks cached for 5 seconds per phone number
- WebSocket connections reused across rate limit checks
- Automatic cleanup prevents database bloat

---

## Migration Guide

### From Old Rate Limiting System
The previous NeonDB-based rate limiting in the webapp has been completely replaced. No migration is needed - the new system starts fresh with a clean database schema.

### Environment Variable Changes
```bash
# REMOVED (no longer needed)
DATABASE_URL  # From webapp
NEON_DATABASE_URL  # From webapp

# ADDED (websocket-server)
DATABASE_URL  # For Fly.io PostgreSQL
PHONE_ENCRYPTION_KEY  # For secure phone hashing
```

This new architecture provides better performance, enhanced security, and a superior user experience with real-time feedback. 