# Scenario Best Practices

Guidelines for building high-quality, maintainable, and user-friendly scenarios.

## 🎯 Design Principles

### 1. User-Centric Design

**Focus on the user's goals:**
```typescript
// Good: Clear, goal-oriented fields
{
  key: 'interviewGoal',
  label: 'What do you want to practice?',
  type: 'select',
  options: [
    { value: 'technical', label: 'Technical skills assessment' },
    { value: 'behavioral', label: 'Behavioral questions' },
    { value: 'salary', label: 'Salary negotiation' }
  ]
}

// Avoid: Technical jargon without context
{
  key: 'mode',
  label: 'Mode',
  type: 'select',
  options: [
    { value: 'tech', label: 'Tech' },
    { value: 'behav', label: 'Behav' }
  ]
}
```

### 2. Progressive Disclosure

**Start simple, add complexity gradually:**
```typescript
fields: [
  // Essential fields first
  { key: 'jobTitle', label: 'Job Title', type: 'text', required: true },
  { key: 'company', label: 'Company', type: 'text', required: true },
  
  // Optional enhancement fields
  { key: 'jobDescription', label: 'Job Description (Optional)', type: 'textarea', required: false },
  { key: 'difficultyLevel', label: 'Difficulty Level', type: 'select', required: false }
]
```

### 3. Contextual Guidance

**Provide helpful examples and explanations:**
```typescript
{
  key: 'targetAudience',
  label: 'Target Audience',
  type: 'text',
  placeholder: 'e.g., Small business owners, Enterprise CTOs, Healthcare professionals',
  validation: { minLength: 5, maxLength: 200 }
}
```

## 📝 Field Design

### Clear Labels and Descriptions

```typescript
// Good: Descriptive and actionable
{
  key: 'communicationStyle',
  label: 'Preferred Communication Style',
  type: 'select',
  options: [
    { value: 'direct', label: 'Direct and to-the-point' },
    { value: 'consultative', label: 'Consultative and exploratory' },
    { value: 'relationship', label: 'Relationship-focused' }
  ]
}

// Avoid: Vague or technical
{
  key: 'style',
  label: 'Style',
  type: 'select',
  options: [
    { value: 'dir', label: 'Direct' },
    { value: 'cons', label: 'Consultative' }
  ]
}
```

### Smart Defaults

```typescript
{
  key: 'difficulty',
  label: 'Difficulty Level',
  type: 'select',
  required: false,
  // Provide a sensible default
  options: [
    { value: 'beginner', label: 'Beginner - Supportive and encouraging' },
    { value: 'intermediate', label: 'Intermediate - Realistic challenges' }, // Default
    { value: 'advanced', label: 'Advanced - Tough questions and pressure' }
  ]
}
```

### Validation That Helps

```typescript
{
  key: 'companyDescription',
  label: 'Company Description',
  type: 'textarea',
  placeholder: 'Brief description of the company, its mission, and culture...',
  validation: {
    minLength: 20, // Ensure meaningful input
    maxLength: 500 // Prevent overwhelming AI
  }
}
```

## 🤖 AI Instruction Design

### Structure for Clarity

```typescript
generateInstructions: (config) => {
  return `
ROLE: You are a ${config.customerType} customer interested in ${config.product}.

PERSONALITY: ${getPersonalityTraits(config.customerType)}

CONTEXT:
- Company: ${config.companyName}
- Product/Service: ${config.product}
- Your goal: ${config.customerGoal}

BEHAVIOR GUIDELINES:
- Ask relevant questions about features and pricing
- Express concerns typical of your customer type
- Be realistic but not overly difficult
- End the conversation naturally when appropriate

CONVERSATION FLOW:
1. Respond to the salesperson's opening
2. Show interest but ask for details
3. Raise 2-3 realistic objections
4. Make a decision based on their responses
  `;
}
```

### Dynamic and Contextual

```typescript
generateInstructions: (config) => {
  let instructions = `You are a ${config.role} in a ${config.scenario} scenario.`;
  
  // Add role-specific behavior
  if (config.role === 'customer') {
    instructions += ' You have a problem that needs solving.';
  } else if (config.role === 'interviewer') {
    instructions += ' You are evaluating the candidate\'s qualifications.';
  }
  
  // Add difficulty modifiers
  switch (config.difficulty) {
    case 'easy':
      instructions += ' Be supportive and ask straightforward questions.';
      break;
    case 'hard':
      instructions += ' Be challenging and ask tough follow-up questions.';
      break;
    default:
      instructions += ' Be realistic with a mix of easy and challenging questions.';
  }
  
  // Add context-specific details
  if (config.industry) {
    instructions += ` Use terminology and concerns relevant to the ${config.industry} industry.`;
  }
  
  return instructions;
}
```

### Avoid Common Pitfalls

```typescript
// Good: Specific and actionable
generateInstructions: (config) => `
You are a skeptical IT director evaluating ${config.product}.
- Ask about security, scalability, and integration
- Express concern about budget and ROI
- Request references from similar companies
- Be professional but demanding
`;

// Avoid: Vague or contradictory
generateInstructions: (config) => `
You are a customer. Be difficult but helpful. 
Ask questions but don't be too hard.
Be realistic but also challenging.
`;
```

## 🎭 Voice and Persona Design

### Match Voice to Scenario

```typescript
voiceOptions: [
  // For professional scenarios
  { 
    value: 'ash', 
    label: 'Ashley - Professional', 
    description: 'Neutral, business-focused tone for formal interactions' 
  },
  
  // For customer service
  { 
    value: 'coral', 
    label: 'Coral - Friendly Customer', 
    description: 'Warm and approachable for service scenarios' 
  },
  
  // For challenging scenarios
  { 
    value: 'sage', 
    label: 'Sage - Analytical', 
    description: 'Detail-oriented and questioning for technical evaluations' 
  }
]
```

### Contextual Greetings

```typescript
generateGreeting: (config) => {
  const timeOfDay = new Date().getHours();
  const greeting = timeOfDay < 12 ? 'Good morning' : 
                  timeOfDay < 17 ? 'Good afternoon' : 'Good evening';
  
  // Scenario-specific greetings
  if (config.scenarioType === 'cold-call') {
    return `${greeting}, I hope I'm not catching you at a bad time.`;
  } else if (config.scenarioType === 'scheduled') {
    return `${greeting}! Thanks for taking the time to speak with me today.`;
  } else if (config.scenarioType === 'follow-up') {
    return `${greeting}! Good to hear from you again about ${config.topic}.`;
  }
  
  // Default professional greeting
  return `${greeting}, how can I help you today?`;
}
```

## ✅ Validation Best Practices

### Comprehensive but User-Friendly

```typescript
validateConfig: (config) => {
  const errors: string[] = [];
  
  // Required field validation with helpful messages
  if (!config.jobTitle?.trim()) {
    errors.push('Job title is required to create a realistic interview scenario');
  }
  
  if (!config.company?.trim()) {
    errors.push('Company name helps the AI understand the context better');
  }
  
  // Business logic validation
  if (config.experience === 'entry-level' && config.salary > 150000) {
    errors.push('Salary expectation seems high for entry-level position');
  }
  
  // Cross-field validation
  if (config.interviewType === 'technical' && !config.technicalSkills) {
    errors.push('Technical skills are required for technical interviews');
  }
  
  // Helpful warnings (not blocking)
  if (config.jobDescription && config.jobDescription.length < 50) {
    errors.push('Consider adding more detail to the job description for better AI responses');
  }
  
  return errors;
}
```

### Progressive Validation

```typescript
// Validate as user types, not just on submit
validateField: (key: string, value: any, config: ScenarioConfig) => {
  switch (key) {
    case 'email':
      if (value && !isValidEmail(value)) {
        return 'Please enter a valid email address';
      }
      break;
      
    case 'phoneNumber':
      if (value && !isValidPhoneNumber(value)) {
        return 'Please enter a valid phone number (e.g., +1-555-123-4567)';
      }
      break;
      
    case 'budget':
      if (value && value < 1000) {
        return 'Budget should be at least $1,000 for realistic scenarios';
      }
      break;
  }
  
  return null; // No error
}
```

## 🏗️ Code Organization

### Modular Structure

```typescript
// scenarios/sales-call/index.ts
export { salesCallScenario } from './scenario';
export { SalesCallConfig } from './types';
export { validateSalesConfig } from './validation';

// scenarios/sales-call/scenario.ts
import { CallScenario } from '../types';
import { generateSalesInstructions } from './instructions';
import { generateSalesGreeting } from './greeting';
import { validateSalesConfig } from './validation';

export const salesCallScenario: CallScenario = {
  id: 'sales-call',
  name: 'Sales Call Practice',
  description: 'Practice sales conversations with different customer types',
  schema: salesCallSchema,
  generateInstructions: generateSalesInstructions,
  generateGreeting: generateSalesGreeting,
  validateConfig: validateSalesConfig
};
```

### Reusable Components

```typescript
// scenarios/common/voice-options.ts
export const professionalVoices = [
  { value: 'ash', label: 'Ashley - Professional', description: 'Neutral business tone' },
  { value: 'sage', label: 'Sage - Analytical', description: 'Detail-oriented approach' }
];

export const customerServiceVoices = [
  { value: 'coral', label: 'Coral - Friendly', description: 'Warm customer service tone' },
  { value: 'ballad', label: 'Blake - Helpful', description: 'Supportive and patient' }
];

// scenarios/common/validation.ts
export const commonValidation = {
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: string) => /^\+?[\d\s\-\(\)]+$/.test(value),
  notEmpty: (value: string) => value?.trim().length > 0
};
```

## 🧪 Testing Strategies

### Unit Tests for Scenarios

```typescript
// scenarios/__tests__/sales-call.test.ts
import { salesCallScenario } from '../sales-call';

describe('Sales Call Scenario', () => {
  test('generates appropriate instructions', () => {
    const config = {
      product: 'software',
      customerType: 'skeptical',
      difficulty: 'hard'
    };
    
    const instructions = salesCallScenario.generateInstructions(config);
    
    expect(instructions).toContain('skeptical');
    expect(instructions).toContain('software');
    expect(instructions).toContain('challenging');
  });
  
  test('validates required fields', () => {
    const config = { product: '' };
    const errors = salesCallScenario.validateConfig!(config);
    
    expect(errors).toContain('Product/Service is required');
  });
  
  test('generates contextual greetings', () => {
    const config = { companyName: 'Acme Corp' };
    const greeting = salesCallScenario.generateGreeting(config);
    
    expect(greeting).toContain('Acme Corp');
  });
});
```

### Integration Tests

```typescript
// scenarios/__tests__/integration.test.ts
import { ScenarioRegistry } from '../registry';
import { salesCallScenario } from '../sales-call';

describe('Scenario Integration', () => {
  test('scenario registers successfully', () => {
    const registry = new ScenarioRegistry();
    registry.register(salesCallScenario);
    
    const retrieved = registry.get('sales-call');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Sales Call Practice');
  });
  
  test('schema is valid for frontend', () => {
    const schemas = registry.getSchemas();
    const salesSchema = schemas.find(s => s.id === 'sales-call');
    
    expect(salesSchema).toBeDefined();
    expect(salesSchema?.fields).toHaveLength(5);
    expect(salesSchema?.voiceOptions).toHaveLength(4);
  });
});
```

## 📊 Performance Considerations

### Efficient Field Rendering

```typescript
// Use React.memo for field components
const ScenarioField = React.memo(({ field, value, onChange }) => {
  // Component implementation
});

// Debounce validation
const useValidation = (config, scenario) => {
  const [errors, setErrors] = useState({});
  
  const debouncedValidate = useMemo(
    () => debounce((config) => {
      const validationErrors = scenario.validateConfig?.(config) || [];
      setErrors(validationErrors);
    }, 300),
    [scenario]
  );
  
  useEffect(() => {
    debouncedValidate(config);
  }, [config, debouncedValidate]);
  
  return errors;
};
```

### Lazy Loading

```typescript
// scenarios/index.ts
export const initializeScenarios = async (): Promise<ScenarioRegistry> => {
  const registry = new ScenarioRegistry();
  
  // Load core scenarios immediately
  const { jobInterviewScenario } = await import('./job-interview');
  registry.register(jobInterviewScenario);
  
  // Load additional scenarios on demand
  if (process.env.ENABLE_SALES_SCENARIOS) {
    const { salesCallScenario } = await import('./sales-call');
    registry.register(salesCallScenario);
  }
  
  return registry;
};
```

## 🔒 Security Considerations

### Input Sanitization

```typescript
validateConfig: (config) => {
  const errors: string[] = [];
  
  // Sanitize inputs
  Object.keys(config).forEach(key => {
    if (typeof config[key] === 'string') {
      // Remove potentially dangerous content
      config[key] = config[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();
    }
  });
  
  // Validate sanitized content
  if (!config.jobTitle || config.jobTitle.length < 2) {
    errors.push('Job title must be at least 2 characters');
  }
  
  return errors;
}
```

### Rate Limiting

```typescript
// Implement scenario-specific rate limiting
const scenarioRateLimits = {
  'job-interview': { maxCalls: 5, windowMs: 60000 }, // 5 calls per minute
  'sales-call': { maxCalls: 3, windowMs: 60000 },    // 3 calls per minute
  'default': { maxCalls: 2, windowMs: 60000 }        // 2 calls per minute
};
```

## 📈 Analytics and Monitoring

### Scenario Usage Tracking

```typescript
// Track scenario usage for insights
const trackScenarioUsage = (scenarioId: string, config: ScenarioConfig) => {
  analytics.track('scenario_used', {
    scenarioId,
    configFields: Object.keys(config),
    timestamp: new Date().toISOString()
  });
};

// Monitor scenario performance
const trackScenarioPerformance = (scenarioId: string, duration: number) => {
  analytics.track('scenario_performance', {
    scenarioId,
    duration,
    timestamp: new Date().toISOString()
  });
};
```

## 🎯 User Experience Guidelines

### Progressive Enhancement

1. **Start with basics** - Core functionality works without advanced features
2. **Add enhancements** - Advanced options for power users
3. **Graceful degradation** - Fallbacks when features aren't available

### Accessibility

```typescript
// Ensure proper ARIA labels
{
  key: 'difficulty',
  label: 'Difficulty Level',
  type: 'select',
  'aria-describedby': 'difficulty-help',
  helpText: 'Choose how challenging you want the conversation to be'
}
```

### Mobile-First Design

```typescript
// Consider mobile constraints in field design
{
  key: 'description',
  label: 'Description',
  type: 'textarea',
  placeholder: 'Keep it concise for mobile users...',
  validation: {
    maxLength: 500 // Shorter for mobile typing
  }
}
```

Following these best practices will help you create scenarios that are user-friendly, maintainable, and provide excellent AI-powered call experiences. Remember to test thoroughly and gather user feedback to continuously improve your scenarios. 