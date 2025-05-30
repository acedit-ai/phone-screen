# Database Setup for Phone Rate Limiting

This guide explains how to set up a Fly.io PostgreSQL database for persistent phone number rate limiting.

## 🎯 Overview

The websocket server uses a PostgreSQL database to track phone number call limits across deployments. This ensures that the 2-calls-per-hour limit persists even when the server restarts.

## 📋 Prerequisites

- Fly.io CLI installed and authenticated
- Websocket server app already deployed to Fly.io

## 🚀 Setup Steps

### 1. Create PostgreSQL Database

```bash
# Create a new PostgreSQL database in the same region as your app
fly postgres create --name phone-screen-db --region syd

# Note: Replace 'syd' with your app's region
# You can check your app's region with: fly status
```

### 2. Attach Database to Your App

```bash
# Attach the database to your websocket server app
fly postgres attach --app websocket-server-red-resonance-1640 phone-screen-db

# Note: Replace 'websocket-server-red-resonance-1640' with your actual app name
```

This command will automatically:
- Create a `DATABASE_URL` environment variable in your app
- Set up the connection between your app and the database

### 3. Initialize Database Schema

The database schema will be automatically initialized when your app starts. You can also manually initialize it:

```bash
# SSH into your app and run the initialization script
fly ssh console --app websocket-server-red-resonance-1640

# Inside the container, run:
npm run db:init
```

### 4. Verify Setup

Check that the database is working:

```bash
# Check your app's environment variables
fly secrets list --app websocket-server-red-resonance-1640

# You should see DATABASE_URL in the list
```

## 🔧 Environment Variables

The following environment variables are automatically set when you attach the database:

- `DATABASE_URL` - PostgreSQL connection string
- `FLY_DATABASE_URL` - Alternative database URL (fallback)

Optional environment variables you can set:

```bash
# Set a custom encryption key for phone number hashing (recommended for production)
fly secrets set PHONE_ENCRYPTION_KEY="your-secure-random-key-here" --app websocket-server-red-resonance-1640
```

## 📊 Database Schema

The system creates the following table:

```sql
CREATE TABLE phone_rate_limits (
  phone_hash TEXT PRIMARY KEY,           -- Hashed phone number for privacy
  call_count INTEGER NOT NULL DEFAULT 0, -- Number of calls in current window
  window_start BIGINT NOT NULL,          -- Start of current rate limit window
  region TEXT,                           -- Phone number region (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔍 Monitoring

### Check Database Status

```bash
# Check database status
fly postgres db list --app phone-screen-db

# Connect to database directly
fly postgres connect --app phone-screen-db
```

### View Rate Limiting Stats

The server provides endpoints to monitor rate limiting:

```bash
# Health check (includes rate limiting metrics)
curl https://your-app.fly.dev/health

# Detailed metrics
curl https://your-app.fly.dev/metrics
```

## 🛠️ Troubleshooting

### Database Connection Issues

1. **Check if DATABASE_URL is set:**
   ```bash
   fly secrets list --app websocket-server-red-resonance-1640
   ```

2. **Verify database is running:**
   ```bash
   fly status --app phone-screen-db
   ```

3. **Check app logs:**
   ```bash
   fly logs --app websocket-server-red-resonance-1640
   ```

### Rate Limiting Not Working

1. **Check database initialization in logs:**
   Look for messages like:
   ```
   📊 Initializing phone rate limiting database...
   ✅ Phone rate limiting database initialized successfully
   ```

2. **Fallback behavior:**
   If database is unavailable, the system falls back to in-memory rate limiting:
   ```
   ⚠️ Database connection not available - using in-memory fallback for rate limiting
   ```

### Manual Database Operations

```bash
# Connect to database
fly postgres connect --app phone-screen-db

# View current rate limits
SELECT phone_hash, call_count, window_start, region, updated_at 
FROM phone_rate_limits 
ORDER BY updated_at DESC 
LIMIT 10;

# Clear all rate limits (if needed)
DELETE FROM phone_rate_limits;

# View statistics
SELECT 
  COUNT(*) as total_entries,
  SUM(call_count) as total_calls,
  AVG(call_count) as avg_calls_per_entry,
  COUNT(CASE WHEN call_count >= 2 THEN 1 END) as entries_at_limit
FROM phone_rate_limits;
```

## 🔒 Security Notes

- Phone numbers are hashed using HMAC-SHA256 for privacy
- Set a custom `PHONE_ENCRYPTION_KEY` in production
- Database connections use SSL in production
- Rate limit data is automatically cleaned up after 7 days

## 📈 Scaling Considerations

- The current setup supports thousands of concurrent rate limit checks
- Database connection pool is configured for optimal performance
- Consider increasing database resources for high-traffic scenarios

## 🔄 Backup and Recovery

Fly.io PostgreSQL includes automatic backups. To restore:

```bash
# List available backups
fly postgres backup list --app phone-screen-db

# Restore from backup (if needed)
fly postgres backup restore <backup-id> --app phone-screen-db
``` 