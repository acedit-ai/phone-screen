---
sidebar_position: 3
---

# Customization Guide

Learn how to customize your AI Phone Screen system for your specific needs.

## AI Personality & Behavior

### Modifying the AI Prompt

The AI's personality and behavior is controlled by the system prompt in `websocket-server/src/ai-prompt.js`:

```javascript
export const SYSTEM_PROMPT = `
You are an experienced interviewer conducting a phone screen for a job position.

Your personality:
- Professional but friendly
- Patient and encouraging
- Ask follow-up questions
- Keep conversations natural

Interview structure:
1. Brief introduction
2. Ask about their background
3. Technical/role-specific questions
4. Answer their questions
5. Next steps

Keep responses concise (30-50 words).
`;
```

### Interview Types

Customize for different interview styles:

#### Technical Interview
```javascript
const TECHNICAL_PROMPT = `
You are a senior engineer conducting a technical phone screen.
Focus on:
- Problem-solving approach
- Technical concepts
- Code architecture decisions
- Past project challenges
`;
```

#### Behavioral Interview
```javascript
const BEHAVIORAL_PROMPT = `
You are an HR professional focusing on cultural fit.
Ask about:
- Past work experiences
- Team collaboration
- Handling conflicts
- Career motivations
`;
```

## Question Customization

### Dynamic Questions Based on Job Description

The AI automatically adapts questions based on the job description. You can enhance this by:

1. **Adding Industry-Specific Keywords**:
```javascript
const industryKeywords = {
  'fintech': ['regulations', 'compliance', 'security'],
  'healthcare': ['HIPAA', 'patient data', 'medical devices'],
  'ecommerce': ['scalability', 'payment processing', 'user experience']
};
```

2. **Role-Based Question Banks**:
```javascript
const questionBank = {
  'software engineer': [
    'Tell me about your experience with [tech stack]',
    'How do you approach debugging complex issues?',
    'Describe a challenging project you worked on'
  ],
  'product manager': [
    'How do you prioritize features?',
    'Tell me about a time you had to make a data-driven decision',
    'How do you work with engineering teams?'
  ]
};
```

## Voice and Speech

### Changing AI Voice

Modify the voice settings in `websocket-server/src/realtime-client.js`:

```javascript
const voiceOptions = {
  'alloy': 'Neutral, balanced tone',
  'echo': 'Male voice, friendly',
  'fable': 'British accent, professional',
  'onyx': 'Deep male voice, authoritative',
  'nova': 'Female voice, energetic',
  'shimmer': 'Female voice, warm and friendly'
};

// Set your preferred voice
const selectedVoice = 'shimmer';
```

### Speech Settings

```javascript
const speechConfig = {
  voice: 'shimmer',
  speed: 1.0,        // 0.25 to 4.0
  temperature: 0.6,  // 0.0 to 1.0 (creativity)
  max_tokens: 150    // Response length
};
```

## User Interface

### Branding

Update branding in `webapp/components/top-bar.tsx`:

```jsx
// Company name and logo
<h1 className="text-xl font-bold">Your Company Name</h1>
<p className="text-sm text-gray-600">Custom tagline here</p>

// Colors
className="bg-gradient-to-r from-blue-600 to-blue-700" // Your brand colors
```

### Custom Styling

Override styles in `webapp/app/globals.css`:

```css
:root {
  --primary-color: #your-brand-color;
  --secondary-color: #your-secondary-color;
  --accent-color: #your-accent-color;
}

/* Custom interview card styling */
.interview-card {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}
```

## Phone Numbers & Regions

### Adding Multiple Phone Numbers

In your Twilio console:

1. **Purchase additional numbers** for different regions
2. **Configure webhooks** for each number to point to your server
3. **Update the frontend** to show region-specific numbers:

```jsx
const phoneNumbers = {
  'US': '+1 (555) 123-4567',
  'UK': '+44 20 1234 5678',
  'AU': '+61 2 1234 5678'
};

// Region selector component
<select onChange={handleRegionChange}>
  {Object.keys(phoneNumbers).map(region => (
    <option key={region} value={region}>{region}</option>
  ))}
</select>
```

## Database Customization

### Adding Custom Fields

Extend the database schema in `webapp/prisma/schema.prisma`:

```prisma
model CallSession {
  id          String   @id @default(cuid())
  phoneNumber String
  jobTitle    String
  company     String?
  
  // Custom fields
  industry    String?
  experience  String?
  customNotes String?
  rating      Int?
  
  createdAt   DateTime @default(now())
  transcript  String?
}
```

### Custom Analytics

Track additional metrics:

```javascript
// In your call handler
const analytics = {
  callDuration: endTime - startTime,
  questionsAsked: questionCount,
  interruptionCount: interruptions,
  sentimentScore: calculateSentiment(transcript)
};

await db.callSession.update({
  where: { id: sessionId },
  data: { analytics: JSON.stringify(analytics) }
});
```

## Integration Examples

### Slack Notifications

Send call summaries to Slack:

```javascript
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function sendCallSummary(transcript, jobTitle) {
  await slack.chat.postMessage({
    channel: '#interviews',
    text: `📞 New phone screen completed for ${jobTitle}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Job*: ${jobTitle}\n*Duration*: ${duration} minutes`
        }
      }
    ]
  });
}
```

### ATS Integration

Connect to your Applicant Tracking System:

```javascript
async function syncToATS(candidateData, transcript) {
  const response = await fetch('https://your-ats.com/api/candidates', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ATS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: candidateData.name,
      position: candidateData.jobTitle,
      phoneScreenTranscript: transcript,
      status: 'phone_screen_completed'
    })
  });
}
```

## Advanced Configurations

### Load Balancing

For high volume, set up multiple WebSocket servers:

```javascript
// Load balancer configuration
const servers = [
  'ws://server1:8081',
  'ws://server2:8081',
  'ws://server3:8081'
];

function getAvailableServer() {
  // Round-robin or least-connections logic
  return servers[Math.floor(Math.random() * servers.length)];
}
```

### Rate Limiting

Implement custom rate limiting:

```javascript
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 calls per window per IP
  message: 'Too many calls, please try again later'
};
```

## Testing Customizations

### Unit Tests

Test your customizations:

```javascript
// Test custom prompts
describe('Custom AI Prompts', () => {
  test('should generate technical questions for software engineer role', () => {
    const questions = generateQuestions('Software Engineer', techJobDescription);
    expect(questions).toContain('technical');
    expect(questions.length).toBeGreaterThan(3);
  });
});
```

### Integration Tests

```bash
# Test the full flow with your customizations
npm run test:integration

# Test specific voice settings
npm run test:voice-config
```

Need help with customization? Check our [examples repository](https://github.com/acedit-ai/phone-screen-examples) or [join our Discord](https://discord.gg/your-invite)! 