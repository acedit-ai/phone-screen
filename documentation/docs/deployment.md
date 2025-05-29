---
sidebar_position: 4
---

# Deployment Guide

Deploy your AI Phone Screen system to production with confidence.

## Overview

The system consists of two main components:
- **Frontend**: Next.js webapp (can be deployed to Vercel, Netlify, etc.)
- **Backend**: WebSocket server (requires a VPS or cloud instance)

## Quick Deploy (Recommended)

### Frontend: Vercel

1. **Push to GitHub** (if not already done):
```bash
git push origin main
```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `webapp` folder as root directory
   - Add environment variables (see below)
   - Deploy!

3. **Configure Custom Domain** (optional):
   - Add your domain in Vercel dashboard
   - Update DNS records as instructed

### Backend: Fly.io (Recommended)

The project includes pre-configured Fly.io deployment with GitHub Actions.

**Option A: Automatic Deployment (Recommended)**

1. **Install Fly.io CLI**:
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login to Fly.io**:
```bash
flyctl auth login
```

3. **Deploy from websocket-server directory**:
```bash
cd websocket-server
flyctl launch
```

4. **Set environment variables**:
```bash
flyctl secrets set OPENAI_API_KEY="your-openai-key"
flyctl secrets set TWILIO_ACCOUNT_SID="your-twilio-sid"
flyctl secrets set TWILIO_AUTH_TOKEN="your-twilio-token"
flyctl secrets set NODE_ENV="production"
```

5. **Deploy**:
```bash
flyctl deploy
```

**Automatic Deployments**: The included GitHub Actions will automatically deploy on every push to main branch.

**Option B: Railway** (Alternative)

1. **Connect GitHub repo** at [railway.app](https://railway.app)
2. **Select websocket-server** folder as root
3. **Add environment variables** (see below)
4. **Deploy automatically** on every push

**Option C: Render** (Alternative)

1. **Connect GitHub repo** at [render.com](https://render.com)
2. **Create new Web Service**
3. **Set build command**: `cd websocket-server && npm install`
4. **Set start command**: `cd websocket-server && npm start`

## Environment Variables

### Frontend (.env.production)

```bash
# Database (production)
DATABASE_URL="postgresql://user:pass@host/db"

# Redis (production) 
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-site-key"
TURNSTILE_SECRET_KEY="your-secret-key"

# WebSocket URL (Fly.io deployment)
NEXT_PUBLIC_WEBSOCKET_SERVER_URL="https://your-app-name.fly.dev"

# Scenario Filtering (Optional)
NEXT_PUBLIC_ALLOWED_SCENARIOS="job-interview"
```

### Backend (.env.production or Fly.io Secrets)

For Fly.io, use `flyctl secrets set` instead of .env files:

```bash
# Set via Fly.io CLI
flyctl secrets set OPENAI_API_KEY="sk-your-production-key"
flyctl secrets set TWILIO_ACCOUNT_SID="your-twilio-sid"
flyctl secrets set TWILIO_AUTH_TOKEN="your-twilio-token"
flyctl secrets set NODE_ENV="production"

# Optional: Set allowed origins for CORS
flyctl secrets set ALLOWED_ORIGINS="https://your-domain.com,https://your-domain.vercel.app"
```

**Alternative (.env for other platforms)**:
```bash
# OpenAI
OPENAI_API_KEY="sk-your-production-key"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"

# Environment
NODE_ENV="production"
PORT="8081"

# CORS (your frontend domain)
ALLOWED_ORIGINS="https://your-domain.com,https://your-domain.vercel.app"
```

## Database Setup

### Option 1: Neon (Recommended)

1. **Create account** at [neon.tech](https://neon.tech)
2. **Create new project** and database
3. **Copy connection string**
4. **Run migrations**:
```bash
cd webapp
npx prisma generate
npx prisma db push
```

### Option 2: Supabase

1. **Create project** at [supabase.com](https://supabase.com)
2. **Get connection string** from Settings → Database
3. **Enable connection pooling** for production
4. **Run migrations** as above

### Option 3: Traditional PostgreSQL

```bash
# Create production database
createdb phone_screen_prod

# Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:5432/phone_screen_prod"

# Run migrations
cd webapp && npx prisma db push
```

## WebSocket Server Production Setup

### Fly.io Configuration (Recommended)

The project includes a pre-configured `fly.toml` file:

```toml
# websocket-server/fly.toml
app = 'your-app-name'
primary_region = 'syd'  # Choose your preferred region

[build]

[http_service]
  internal_port = 8081
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
```

**GitHub Actions Setup**:

The project includes automatic deployment workflows:
- `deploy.yml`: Deploys to production on main branch pushes
- `pr-preview.yml`: Creates preview apps for pull requests

To enable automatic deployments:
1. Set `FLY_API_TOKEN` in GitHub repository secrets
2. Set `FLY_ORG` in GitHub repository secrets (for PR previews)

### Alternative: Dockerfile

For other platforms, create `websocket-server/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1

# Start server
CMD ["npm", "start"]
```

### Health Check Endpoint

Add to your WebSocket server:

```javascript
// Add to your Express app
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Production Optimizations

### Performance

```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Set proper headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

### SSL Certificate

**Automatic (Recommended)**:
- Vercel, Railway, Render provide automatic SSL
- Use Let's Encrypt for custom deployments

**Manual Setup**:
```bash
# Install Certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Database Connection Pooling

```javascript
// For high traffic, use connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // max number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Monitoring & Logging

### Application Monitoring

**Sentry Integration**:

```bash
npm install @sentry/node @sentry/nextjs
```

```javascript
// In your WebSocket server
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Error tracking
app.use(Sentry.Handlers.errorHandler());
```

### Logging

```javascript
// Production logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Uptime Monitoring

Set up monitoring with:
- [UptimeRobot](https://uptimerobot.com) (free)
- [Pingdom](https://pingdom.com)
- [Better Uptime](https://betteruptime.com)

Monitor these endpoints:
- `https://your-frontend.com` (webapp health)
- `https://your-backend.com/health` (API health)

## Twilio Production Configuration

### Phone Number Setup

1. **Purchase production phone number**:
   - Go to Twilio Console → Phone Numbers
   - Buy a number in your target region
   - Enable Voice capabilities

2. **Configure webhook**:
   - Set webhook URL to: `https://your-backend.com/incoming-call`
   - Set HTTP method: `POST`
   - Enable fallback URL (optional)

3. **Set up TwiML bins** (optional):
   - Create TwiML responses for error handling
   - Set as fallback URLs

### Security

```javascript
// Verify Twilio requests in production
const twilio = require('twilio');

app.use('/webhook', (req, res, next) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `https://your-domain.com${req.originalUrl}`;
  
  if (twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, req.body)) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
});
```

## Scaling Considerations

### Horizontal Scaling

For high traffic, deploy multiple WebSocket server instances:

```yaml
# docker-compose.yml
version: '3.8'
services:
  websocket-server-1:
    build: ./websocket-server
    ports:
      - "8081:8081"
    environment:
      - INSTANCE_ID=1
      
  websocket-server-2:
    build: ./websocket-server
    ports:
      - "8082:8081"
    environment:
      - INSTANCE_ID=2
      
  nginx:
    image: nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Load Balancer Configuration

```nginx
# nginx.conf
upstream websocket_backend {
    server websocket-server-1:8081;
    server websocket-server-2:8081;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Backup & Recovery

### Database Backups

**Automated (Recommended)**:
```bash
# Daily backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
aws s3 cp backup_$(date +%Y%m%d).sql s3://your-backup-bucket/
```

**Manual Backup**:
```bash
# Create backup
pg_dump $DATABASE_URL > phone_screen_backup.sql

# Restore backup
psql $DATABASE_URL < phone_screen_backup.sql
```

### Configuration Backups

```bash
# Backup environment variables
echo "# Frontend env" > backup.env
vercel env ls >> backup.env
echo "# Backend env" >> backup.env
railway variables >> backup.env
```

## Deployment Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates active
- [ ] Twilio webhooks configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Error tracking configured
- [ ] Documentation updated

### Testing Production Deploy

```bash
# Test WebSocket connection
wscat -c wss://your-backend.com

# Test API endpoints
curl https://your-backend.com/health

# Test phone integration
# (Make actual test call)
```

## Cost Optimization

### Estimated Monthly Costs

**Minimal Setup** (~$15-25/month):
- Vercel: Free (Hobby plan)
- Fly.io: $0-5 (shared-cpu-1x, 1GB RAM, auto-scale to zero)
- Neon: Free (1GB database)
- Twilio: $1 + usage

**Production Setup** (~$75-100/month):
- Vercel Pro: $20
- Fly.io: $15-30 (dedicated resources, multiple regions)
- Database: $15-25
- Twilio: $1 + usage
- Monitoring: $5-15

### Cost Reduction Tips

1. **Use free tiers** when possible
2. **Configure auto-scaling** on Fly.io (scale to zero when idle)
3. **Monitor usage** with alerts
4. **Optimize database queries** to reduce load
5. **Cache frequently accessed data**
6. **Use CDN** for static assets
7. **Choose regions wisely** to minimize latency and costs

Need help with deployment? Check our [deployment examples](https://github.com/acedit-ai/phone-screen-examples/tree/main/deployment) or [contact support](mailto:support@acedit.ai)!

## Fly.io Management

### Common Commands

```bash
# Check app status
flyctl status

# View logs
flyctl logs

# Scale app (set minimum instances)
flyctl scale count 1

# Update machine resources
flyctl scale memory 2gb

# List secrets
flyctl secrets list

# Update a secret
flyctl secrets set OPENAI_API_KEY="new-key"

# Open app in browser
flyctl open

# Connect to app console
flyctl ssh console

# View metrics
flyctl metrics
```

### Monitoring

```bash
# Real-time logs
flyctl logs -f

# App dashboard
flyctl dashboard

# Health checks
curl https://your-app.fly.dev/health
```

### Scaling

```bash
# Auto-scale configuration (already in fly.toml)
min_machines_running = 0    # Scale to zero when idle
auto_start_machines = true  # Auto-start on requests
auto_stop_machines = 'stop' # Stop when idle

# Manual scaling
flyctl scale count 2        # Run 2 instances minimum
flyctl scale count 0        # Scale to zero
```

## Monitoring & Logging

```bash
# Real-time logs
flyctl logs -f

# App dashboard
flyctl dashboard

# Health checks
curl https://your-app.fly.dev/health
``` 