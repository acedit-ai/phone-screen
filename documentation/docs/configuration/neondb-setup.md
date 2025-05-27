---
sidebar_position: 1
---

# NeonDB Setup for Persistent Rate Limiting

This guide explains how to set up NeonDB for persistent rate limiting in the phone screening application.

## Why NeonDB?

The application uses persistent rate limiting to ensure limits work correctly across:
- Server restarts
- Multiple deployment instances  
- Vercel deployments with different instances

Previously, rate limits were stored in memory and would reset on every deployment.

## Setup Steps

### 1. Create a NeonDB Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project

### 2. Get Your Database URL
1. In your Neon dashboard, go to your project
2. Navigate to the "Connection Details" section
3. Copy the connection string (it looks like this):
   ```
   postgresql://username:password@hostname/database?sslmode=require
   ```

### 3. Configure Environment Variables

#### For Local Development
Add to your `webapp/.env.local`:
```bash
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
ADMIN_SECRET=your-secure-admin-password
```

#### For Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add these variables:
   - `DATABASE_URL`: Your NeonDB connection string
   - `ADMIN_SECRET`: A secure password for admin endpoints

### 4. Initialize the Database Schema

After setting up the environment variables, initialize the database:

#### Via API Call
```bash
curl -X POST https://your-app.vercel.app/api/admin/init-db \
  -H "Authorization: Bearer your-secure-admin-password"
```

#### Or For Local Development
```bash
curl -X POST http://localhost:3000/api/admin/init-db \
  -H "Authorization: Bearer your-secure-admin-password"
```

You should see a response like:
```json
{
  "success": true,
  "message": "Database schema initialized successfully"
}
```

## Rate Limiting Features

### IP-Based Rate Limiting
- **Calls**: 3 per 15 minutes per IP
- **API requests**: 10 per 15 minutes per IP

### Phone Number-Based Rate Limiting  
- **Per phone number**: 2 calls per hour
- This prevents abuse of calling the same number repeatedly

### Rate Limit Headers
The API returns helpful headers:
```
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1703123456
X-Phone-RateLimit-Remaining: 1
```

## Error Responses

### IP Rate Limit Exceeded
```json
{
  "error": "Too many requests. Limit: 3 per 15 minutes",
  "type": "ip_rate_limit"
}
```

### Phone Number Rate Limit Exceeded  
```json
{
  "error": "Too many calls to this number. Limit: 2 per 1 hour(s)",
  "type": "phone_rate_limit",
  "phoneNumber": "+1234567890"
}
```

## Database Schema

The system creates a simple `rate_limits` table:

```sql
CREATE TABLE rate_limits (
  id TEXT PRIMARY KEY,              -- IP:identifier or phone:number
  count INTEGER NOT NULL DEFAULT 0, -- Current request count
  window_start BIGINT NOT NULL,     -- Window start timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Monitoring

Check the Vercel logs or your server logs for rate limiting activity:
- `✅ Persistent rate limit check passed for IP...`
- `🚫 Phone number rate limit exceeded for...`
- `✅ Rate limiting database schema initialized`

## Troubleshooting

### Database Connection Issues
1. Verify your `DATABASE_URL` is correct
2. Check that your Neon database is active (free tier may pause)
3. Ensure the connection string includes `?sslmode=require`

### Rate Limits Not Working
1. Check that the database was initialized (`/api/admin/init-db`)
2. Verify environment variables are set in your deployment
3. Check the admin stats endpoint to see if data is being recorded

### Performance
The database implementation is lightweight:
- Simple indexed lookups
- Automatic cleanup of old entries
- Graceful fallback if database is unavailable 