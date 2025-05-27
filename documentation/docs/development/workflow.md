---
sidebar_position: 1
---

# Development Workflow

This guide outlines the recommended development workflow for contributing to the AI Phone Screen project.

## 🚀 Quick Development Setup

### Prerequisites
- Node.js 18+
- Git
- ngrok account (for local development)

### 1. Clone and Setup
```bash
git clone https://github.com/acedit-ai/phone-screen.git
cd phone-screen

# Install dependencies for both components
cd webapp && npm install
cd ../websocket-server && npm install
cd ../documentation && npm install
```

### 2. Environment Configuration

Set up your environment files following the [Environment Setup Guide](../getting-started/environment-setup).

**Key files to create:**
- `webapp/.env.local`
- `websocket-server/.env`

### 3. Start Development Services

**Terminal 1: Start ngrok**
```bash
ngrok http 8081
# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)
```

**Terminal 2: Start WebSocket Server**
```bash
cd websocket-server
# Update .env with your ngrok URL
echo "PUBLIC_URL=https://abc123.ngrok-free.app" >> .env
npm run dev
```

**Terminal 3: Start Webapp**
```bash
cd webapp
# Update .env.local with your ngrok URL
echo "NEXT_PUBLIC_WEBSOCKET_SERVER_URL=https://abc123.ngrok-free.app" >> .env.local
npm run dev
```

### 4. Test Your Setup
1. Open `http://localhost:3000`
2. Configure a mock interview
3. Enter your phone number
4. Complete verification (if enabled)
5. Start an interview call

## 🔄 Development Workflow

### Branch Strategy

**Main Branch**: `main`
- Always deployable
- Protected branch requiring PR reviews
- Automatically deploys to production

**Feature Branches**: `feature/your-feature-name`
- Created from `main`
- Used for developing new features
- Automatically get PR preview environments

**Example**:
```bash
git checkout main
git pull origin main
git checkout -b feature/improve-ui
# Make your changes
git add .
git commit -m "feat: improve user interface design"
git push origin feature/improve-ui
# Create PR via GitHub
```

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new rate limiting feature
fix: resolve websocket connection issue
docs: update environment setup guide
style: format code with prettier
refactor: reorganize session management
test: add unit tests for rate limiting
chore: update dependencies
```

### Code Quality Standards

**Before committing:**
1. **Run tests**: `npm test`
2. **Check linting**: `npm run lint`
3. **Format code**: `npm run format`
4. **Type checking**: `npm run type-check`

**Automated checks:**
- GitHub Actions run on every PR
- Tests must pass before merging
- Code must be properly formatted

## 🧪 Testing Strategy

### Unit Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Integration Testing
```bash
# Test websocket connection
npm run test:websocket

# Test session management
npm run test:session-cleanup

# Test rate limiting
npm run test:rate-limits
```

### Manual Testing Checklist

**Basic Flow:**
- [ ] App loads without errors
- [ ] Job configuration form works
- [ ] Phone number validation works
- [ ] Verification completes (if enabled)
- [ ] Call starts successfully
- [ ] Transcript appears in real-time
- [ ] Call ends properly
- [ ] "Practice Again" resets state

**Edge Cases:**
- [ ] Invalid phone numbers are rejected
- [ ] Rate limits are enforced
- [ ] Network failures are handled gracefully
- [ ] Multiple rapid calls don't break system
- [ ] Browser refresh during call doesn't crash

### PR Preview Testing

Every PR automatically gets a preview environment:
- **WebSocket Server**: `wss://pr-{PR_NUMBER}-acedit-ai-phone-screen.fly.dev`
- **Webapp**: Deployed to Vercel preview URL

**To test a PR:**
1. Open the Vercel preview URL from the PR
2. Complete the full user flow
3. Check browser console for errors
4. Verify websocket connection works

## 📝 Documentation Workflow

### Documentation Updates

**When to update docs:**
- Adding new features
- Changing configuration
- Updating environment variables
- Modifying deployment process

**How to update:**
```bash
cd documentation
npm run dev  # Start Docusaurus dev server
# Edit files in docs/ directory
npm run build  # Test the build
```

**Documentation structure:**
```
docs/
├── getting-started/     # Setup and configuration
├── architecture/        # How the system works
├── configuration/       # Detailed configuration guides  
├── deployment/         # Production deployment
└── development/        # Development guides
```

### Building Documentation

**Local development:**
```bash
cd documentation
npm run dev  # http://localhost:3000
```

**Production build:**
```bash
npm run build
npm run serve  # Test production build
```

## 🚀 Deployment Process

### Automatic Deployments

**Production (main branch):**
- WebSocket Server → fly.io
- Webapp → Vercel
- Documentation → GitHub Pages

**PR Previews:**
- WebSocket Server → fly.io (temporary app)
- Webapp → Vercel (preview deployment)

### Manual Deployments

**WebSocket Server (fly.io):**
```bash
cd websocket-server
fly deploy
```

**Webapp (Vercel):**
```bash
cd webapp
vercel --prod
```

**Documentation:**
```bash
cd documentation
npm run build
npm run deploy
```

## 🔧 Common Development Tasks

### Adding New Environment Variables

1. Add to environment setup docs
2. Update example files (`.env.example`)
3. Add to GitHub Actions if needed
4. Update Vercel project settings for production

### Adding New Dependencies

```bash
# Webapp dependencies
cd webapp
npm install package-name
npm install -D dev-package-name

# WebSocket server dependencies  
cd websocket-server
npm install package-name

# Documentation dependencies
cd documentation  
npm install package-name
```

### Debugging Issues

**WebSocket Connection Issues:**
1. Check ngrok is running and URLs match
2. Verify environment variables are set
3. Check browser network tab for WebSocket errors
4. Review server logs for connection attempts

**Call Not Starting:**
1. Verify Twilio credentials are correct
2. Check webhook URL is accessible
3. Review Twilio console for error logs
4. Ensure proper phone number formatting

**Verification Issues:**
1. Check Turnstile keys are configured
2. Verify domain is whitelisted in Cloudflare
3. Check browser console for verification errors
4. Review session storage for tokens

## 📋 Code Review Guidelines

### What to Review

**Functionality:**
- [ ] Code solves the stated problem
- [ ] Edge cases are handled
- [ ] Error handling is comprehensive
- [ ] Performance impact is acceptable

**Code Quality:**
- [ ] Code is readable and well-commented
- [ ] Functions are appropriately sized
- [ ] Variable names are descriptive
- [ ] No code duplication

**Testing:**
- [ ] Tests cover new functionality
- [ ] Existing tests still pass
- [ ] Manual testing was performed

**Documentation:**
- [ ] README updates if needed
- [ ] API changes are documented
- [ ] Environment variable changes noted

### Review Process

1. **Automated Checks**: Wait for CI to pass
2. **Manual Review**: Code walkthrough by maintainer
3. **Testing**: Functional testing in PR preview
4. **Approval**: At least one approval required
5. **Merge**: Squash and merge to main

## 🎯 Best Practices

### Code Organization
- Keep components small and focused
- Use TypeScript for type safety
- Follow existing code patterns
- Document complex logic

### Performance
- Minimize bundle sizes
- Optimize database queries
- Use appropriate caching strategies
- Monitor memory usage

### Security
- Validate all inputs
- Use environment variables for secrets
- Follow principle of least privilege
- Keep dependencies updated

### User Experience
- Provide clear error messages
- Show loading states
- Handle network failures gracefully
- Maintain responsive design

This workflow ensures consistent, high-quality development while maintaining the project's stability and reliability. 