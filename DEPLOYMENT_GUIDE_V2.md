# 🚀 Production Deployment Guide

Complete guide for deploying the AI-Powered Call Practice System with database-backed rate limiting and real-time UI features.

## 🏗️ Architecture Overview

The system now consists of two applications with a shared database:

```
┌─────────────────┐                 ┌──────────────────────┐
│     Webapp      │◄──────────────►│   Websocket-Server   │
│  (Vercel/CDN)   │    WebSocket    │     (Fly.io)         │
└─────────────────┘                 └──────────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │   Fly.io PostgreSQL  │
                                    │      Database        │
                                    └──────────────────────┘
```

## 📋 Prerequisites

- **Fly.io Account** (for backend and database)
- **Vercel Account** (for frontend)
- **Twilio Account** with phone numbers
- **OpenAI API Key**
- **GitHub Repository**

## 🗄️ Step 1: Database Setup (Fly.io PostgreSQL)

### Create Database
```bash
# Install Fly.io CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login

# Create PostgreSQL database
flyctl postgres create phone-screen-db --region ord

# Note the connection details shown after creation
```

### Database Configuration
After creation, you'll see output like:
```
Postgres cluster phone-screen-db created
  Username:    postgres
  Password:    <generated-password>
  Hostname:    phone-screen-db.internal
  Flycast:     fdaa:2:45b:0:1::3
  Proxy port:  5432
  Postgres port: 5433
  Connection string: postgres://postgres:<password>@phone-screen-db.flycast:5432
```

**Save these credentials** - you'll need them for the websocket-server configuration.

## 🔧 Step 2: Websocket-Server Deployment

### Environment Configuration
Create `websocket-server/.env` for production:

```bash
# Core Configuration
NODE_ENV=production
PORT=8081

# Database Configuration (from Step 1)
DATABASE_URL=postgres://postgres:<password>@phone-screen-db.flycast:5432/phone_screen
FLY_DATABASE_URL=postgres://postgres:<password>@phone-screen-db.flycast:5432/phone_screen

# Security (generate with: openssl rand -hex 32)
PHONE_ENCRYPTION_KEY=your-32-character-secret-key-here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACyour-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Regional Phone Numbers
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890  # Optional
TWILIO_PHONE_NUMBER_IN=+91234567890  # Optional

# Rate Limiting Configuration
RATE_LIMIT_CLEANUP_INTERVAL=3600000  # 1 hour

# Public URL (will be set after deployment)
PUBLIC_URL=https://your-app-name.fly.dev
```

### Deploy to Fly.io
```bash
cd websocket-server

# Create Fly.io app
flyctl launch

# Set environment variables
flyctl secrets set \
  DATABASE_URL="postgres://postgres:<password>@phone-screen-db.flycast:5432/phone_screen" \
  PHONE_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  OPENAI_API_KEY="sk-your-openai-api-key" \
  TWILIO_ACCOUNT_SID="ACyour-twilio-account-sid" \
  TWILIO_AUTH_TOKEN="your-twilio-auth-token" \
  TWILIO_PHONE_NUMBER_US="+1234567890"

# Deploy
flyctl deploy

# Get app URL
flyctl info
```

### Initialize Database
```bash
# Connect to your deployed app and initialize the database
flyctl ssh console

# Inside the container
npm run db:init

# Exit
exit
```

### Verify Deployment
```bash
# Check logs
flyctl logs

# Test health endpoint
curl https://your-app-name.fly.dev/health

# Test database connection
curl https://your-app-name.fly.dev/api/stats
```

## 🌐 Step 3: Webapp Deployment (Vercel)

### Environment Configuration
In your Vercel dashboard, add these environment variables:

**Production Environment Variables:**
```bash
# WebSocket Server Connection
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=wss://your-app-name.fly.dev

# Twilio Configuration (for outbound calls)
TWILIO_ACCOUNT_SID=ACyour-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61234567890  # Optional
TWILIO_PHONE_NUMBER_IN=+91234567890  # Optional

# Optional: Cloudflare Turnstile (Bot Protection)
NEXT_PUBLIC_TURNSTILE_ENABLED=true
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-cloudflare-site-key
TURNSTILE_SECRET_KEY=your-cloudflare-secret-key

# Environment
NODE_ENV=production
```

### Deploy to Vercel
```bash
# From your local machine
cd webapp

# Deploy to Vercel (first time)
npx vercel --prod

# Or connect via GitHub integration:
# 1. Push to GitHub
# 2. Connect repository in Vercel dashboard
# 3. Set root directory to "webapp"
# 4. Add environment variables
# 5. Deploy
```

### Configure Domain (Optional)
1. **Add Custom Domain** in Vercel dashboard
2. **Update DNS** records as instructed
3. **SSL Certificate** will be auto-provisioned

## 🔗 Step 4: Connect Components

### Update Webhook URLs
Update your Twilio webhook URLs to point to your deployed websocket-server:

**TwiML Webhooks:**
- **Voice URL**: `https://your-app-name.fly.dev/twiml`
- **Status Callback**: `https://your-app-name.fly.dev/webhook/status`

### Test Integration
```bash
# Test WebSocket connection from webapp
# Open browser console on your webapp and check for:
"📞 Connected to rate limit websocket"

# Test end-to-end flow
# 1. Visit your webapp
# 2. Enter a valid phone number
# 3. Check rate limit indicator shows
# 4. Make a test call
```

## 🔐 Step 5: Security Configuration

### Database Security
```bash
# Enable connection encryption (if not already enabled)
flyctl postgres update --encrypt-backups phone-screen-db

# Set up database firewall rules (optional)
flyctl postgres connect --database phone-screen-db
```

### Environment Security
```bash
# Rotate encryption key (if needed)
NEW_KEY=$(openssl rand -hex 32)
flyctl secrets set PHONE_ENCRYPTION_KEY="$NEW_KEY"

# Update Twilio webhook security
# 1. Enable webhook signature validation in Twilio console
# 2. Ensure TWILIO_AUTH_TOKEN is properly set for signature verification
```

### Rate Limiting Security
- **Phone limits**: 2 calls per hour (database-enforced)
- **IP limits**: 10 calls per 15 minutes (webapp-enforced)
- **Automatic cleanup**: Old entries removed every hour

## 📊 Step 6: Monitoring & Health Checks

### Health Endpoints
```bash
# Websocket-Server Health
curl https://your-app-name.fly.dev/health
# Expected: {"status": "healthy", "database": "connected", "timestamp": "..."}

# Rate Limiting Stats
curl https://your-app-name.fly.dev/api/stats
# Expected: {"totalEntries": 123, "entriesLast24h": 45, ...}

# Database Connection Test
curl https://your-app-name.fly.dev/api/db-test
# Expected: {"database": "connected", "latency": "2ms"}
```

### Monitoring Setup
```bash
# Enable Fly.io monitoring
flyctl monitor dashboard

# Set up log streaming
flyctl logs --app your-app-name

# Database monitoring
flyctl postgres list
flyctl postgres status phone-screen-db
```

### Error Monitoring
Key logs to monitor:
- `📊 Database connection pool initialized`
- `✅ Phone rate limiting database initialized`
- `⚠️ Database connection not available - using in-memory fallback`
- `❌ Failed to initialize database`

## 🔄 Step 7: Backup & Recovery

### Database Backups
```bash
# Fly.io automatically creates daily backups
flyctl postgres backup list phone-screen-db

# Create manual backup
flyctl postgres backup create phone-screen-db

# Restore from backup (if needed)
flyctl postgres restore --source backup-id phone-screen-db
```

### Application Backups
- **Frontend**: Automatically backed up via Vercel/GitHub
- **Backend**: Backed up via GitHub + Docker images in Fly.io registry

## 🚀 Step 8: Custom Domain & SSL

### Frontend Domain (Vercel)
1. **Add Domain** in Vercel dashboard
2. **Configure DNS**:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
3. **SSL Certificate**: Auto-provisioned by Vercel

### Backend Domain (Fly.io)
```bash
# Add custom domain to Fly.io app
flyctl certs create your-backend-domain.com

# Configure DNS
flyctl certs show your-backend-domain.com
# Follow the DNS configuration instructions
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
flyctl postgres status phone-screen-db

# Check connection from app
flyctl ssh console
# Inside container: npm run db:test
```

#### WebSocket Connection Issues
```bash
# Check app logs
flyctl logs --app your-app-name

# Verify WebSocket endpoint
curl -I https://your-app-name.fly.dev/logs
# Should return 101 Switching Protocols for WebSocket upgrade
```

#### Rate Limiting Not Working
```bash
# Test rate limit endpoint
curl -X POST https://your-app-name.fly.dev/api/rate-limit-check \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# Check database entries
flyctl postgres connect --database phone-screen-db
# SQL: SELECT * FROM phone_rate_limits;
```

### Performance Optimization
```bash
# Scale app instances
flyctl scale count 2

# Increase memory
flyctl scale memory 1024

# Monitor performance
flyctl metrics
```

## 📈 Production Checklist

### Pre-Launch
- [ ] Database created and initialized
- [ ] Websocket-server deployed and healthy
- [ ] Webapp deployed with correct environment variables
- [ ] Twilio webhooks updated
- [ ] Rate limiting tested end-to-end
- [ ] WebSocket communication verified
- [ ] Phone calls working correctly
- [ ] Error handling tested

### Post-Launch
- [ ] Monitoring dashboards configured
- [ ] Backup strategy verified
- [ ] Custom domains configured (if applicable)
- [ ] SSL certificates active
- [ ] Rate limiting statistics tracking
- [ ] Log aggregation set up

### Ongoing Maintenance
- [ ] Regular database cleanup verification
- [ ] Rate limiting statistics review
- [ ] Performance monitoring
- [ ] Security updates
- [ ] Backup restoration testing

---

## 🔄 Deployment Commands Summary

```bash
# 1. Database Setup
flyctl postgres create phone-screen-db --region ord

# 2. Backend Deployment
cd websocket-server
flyctl launch
flyctl secrets set DATABASE_URL="..." PHONE_ENCRYPTION_KEY="..." # ... other secrets
flyctl deploy
flyctl ssh console && npm run db:init

# 3. Frontend Deployment
cd webapp
npx vercel --prod
# Or use GitHub integration

# 4. Health Check
curl https://your-app-name.fly.dev/health
curl https://your-webapp.vercel.app/api/health
```

## 📞 Support

If you encounter issues during deployment:

1. **Check logs**: `flyctl logs` and Vercel function logs
2. **Verify environment variables**: Ensure all required variables are set
3. **Test components individually**: Database → Backend → Frontend → Integration
4. **Review documentation**: [Architecture docs](./documentation/docs/architecture/)

Your production deployment is now ready! 🎉 