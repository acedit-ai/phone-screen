---
sidebar_position: 5
---

# Troubleshooting Guide

Common issues and solutions for the AI Phone Screen system.

## Quick Fixes

### WebSocket Connection Issues

**Problem**: "WebSocket connection failed" or "Connection refused"

**Solutions**:
1. **Check if WebSocket server is running**:
   ```bash
   cd websocket-server
   npm run dev
   ```

2. **Verify port 8081 is not in use**:
   ```bash
   lsof -ti:8081
   # If something is running, kill it:
   kill $(lsof -ti:8081)
   ```

3. **Check ngrok tunnel**:
   ```bash
   ngrok http 8081
   # Make sure the HTTPS URL matches your webhook configuration
   ```

### Twilio Webhook Problems

**Problem**: Calls not reaching your server

**Solutions**:
1. **Verify webhook URL**:
   - Go to Twilio Console → Phone Numbers
   - Check webhook URL points to your ngrok HTTPS URL
   - Ensure it ends with `/incoming-call`
   - Example: `https://abc123.ngrok.io/incoming-call`

2. **Check Twilio credentials**:
   ```bash
   # In websocket-server/.env
   TWILIO_ACCOUNT_SID="your_sid_here"
   TWILIO_AUTH_TOKEN="your_token_here"
   ```

3. **Test webhook manually**:
   ```bash
   curl -X POST https://your-ngrok-url.ngrok.io/incoming-call \
     -d "From=%2B1234567890" \
     -d "To=%2B0987654321"
   ```

### OpenAI API Issues

**Problem**: "Invalid API key" or "Insufficient quota"

**Solutions**:
1. **Verify API key**:
   ```bash
   # Test your API key
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
   ```

2. **Check Realtime API access**:
   - Realtime API is currently in beta
   - Ensure your account has access
   - Check OpenAI dashboard for usage limits

3. **Monitor usage**:
   - Check your OpenAI dashboard for quota usage
   - Realtime API costs more than regular API calls

### Database Connection Problems

**Problem**: "Connection refused" or "Database does not exist"

**Solutions**:
1. **Check DATABASE_URL format**:
   ```bash
   # Correct format:
   DATABASE_URL="postgresql://username:password@host:5432/database"
   ```

2. **Test database connection**:
   ```bash
   cd webapp
   npx prisma db push
   # This will create tables if they don't exist
   ```

3. **For development with local Postgres**:
   ```bash
   # Start PostgreSQL
   brew services start postgresql
   # Create database
   createdb phone_screen_dev
   ```

## Environment Setup Issues

### Missing Environment Variables

**Problem**: App crashes with "undefined" environment variables

**Solution**: Check all required variables are set:

**Webapp** (`.env.development.local`):
```bash
DATABASE_URL="your_database_url"
UPSTASH_REDIS_REST_URL="your_redis_url"  
UPSTASH_REDIS_REST_TOKEN="your_redis_token"
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_turnstile_key"
TURNSTILE_SECRET_KEY="your_turnstile_secret"
```

**WebSocket Server** (`.env`):
```bash
OPENAI_API_KEY="sk-your-key"
TWILIO_ACCOUNT_SID="your_sid"
TWILIO_AUTH_TOKEN="your_token"
```

### Port Conflicts

**Problem**: "Port 3000 already in use"

**Solutions**:
1. **Kill existing processes**:
   ```bash
   # Find what's using the port
   lsof -ti:3000
   # Kill the process
   kill $(lsof -ti:3000)
   ```

2. **Use different ports**:
   ```bash
   # Webapp on different port
   cd webapp && npm run dev -- -p 3002
   
   # Documentation on different port
   cd documentation && npm start -- --port 3003
   ```

## Build & Deployment Issues

### Docusaurus Build Failures

**Problem**: "Broken links" or build errors

**Solutions**:
1. **Check for broken internal links**:
   ```bash
   # Look for links to non-existent pages
   grep -r "\[.*\](/.*)" docs/
   ```

2. **Temporarily ignore broken links**:
   ```javascript
   // In docusaurus.config.ts
   export default {
     onBrokenLinks: 'warn', // or 'ignore' for testing
   }
   ```

### Vercel Deployment Issues

**Problem**: Build fails on Vercel

**Solutions**:
1. **Set build settings correctly**:
   - Root directory: `webapp`
   - Build command: `npm run build`
   - Output directory: `.next`

2. **Add environment variables** in Vercel dashboard

3. **Check Node.js version**:
   ```json
   // In webapp/package.json
   "engines": {
     "node": ">=18.0.0"
   }
   ```

## Production Issues

### Performance Problems

**Problem**: Slow response times or timeouts

**Solutions**:
1. **Enable connection pooling**:
   ```javascript
   // In your database configuration
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,
     idleTimeoutMillis: 30000
   });
   ```

2. **Add Redis caching**:
   ```javascript
   // Cache frequent database queries
   const cached = await redis.get(`session:${sessionId}`);
   if (cached) return JSON.parse(cached);
   ```

3. **Monitor with APM tools**:
   - Add Sentry for error tracking
   - Use Vercel Analytics for performance monitoring

### SSL Certificate Issues

**Problem**: "Not secure" or certificate errors

**Solutions**:
1. **For custom domains on Vercel**:
   - Ensure DNS records are correct
   - Wait 24-48 hours for propagation

2. **For self-hosted deployments**:
   ```bash
   # Use Certbot for Let's Encrypt
   sudo certbot --nginx -d your-domain.com
   ```

## Getting Help

### Check Logs

1. **Browser console** (F12):
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Server logs**:
   ```bash
   # WebSocket server logs
   cd websocket-server && npm run dev

   # Vercel logs  
   vercel logs your-app-name
   ```

3. **Database logs**:
   ```bash
   # Check Prisma queries
   cd webapp
   npx prisma studio
   ```

### Debug Mode

Enable debug logging:

```bash
# WebSocket server
DEBUG=* npm run dev

# Next.js
cd webapp && npm run dev -- --turbo
```

### Community Support

1. **GitHub Issues**: [Report bugs here](https://github.com/acedit-ai/phone-screen/issues)
2. **Discussions**: [Ask questions](https://github.com/acedit-ai/phone-screen/discussions)
3. **Discord**: [Join our community](https://discord.gg/acedit)
4. **Email**: [support@acedit.ai](mailto:support@acedit.ai)

### Common Error Codes

| Error | Meaning | Solution |
|-------|---------|----------|
| `ECONNREFUSED` | Service not running | Start the required service |
| `EADDRINUSE` | Port already in use | Kill process or use different port |
| `401 Unauthorized` | Invalid API keys | Check and update credentials |
| `403 Forbidden` | Permission denied | Verify webhook signatures |
| `429 Too Many Requests` | Rate limit exceeded | Implement backoff or upgrade plan |
| `500 Internal Server Error` | Server error | Check logs for specific error |

## Still Having Issues?

If none of these solutions work:

1. **Check our [FAQ](https://github.com/acedit-ai/phone-screen/wiki/FAQ)**
2. **Search [existing issues](https://github.com/acedit-ai/phone-screen/issues)**
3. **Create a new issue** with:
   - Your operating system
   - Node.js version (`node --version`)
   - Complete error message
   - Steps to reproduce
   - Environment variables (redacted)

We're here to help! 🚀 