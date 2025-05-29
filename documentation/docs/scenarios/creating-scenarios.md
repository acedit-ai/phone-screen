# Creating Your First Scenario

This guide will walk you through creating a custom scenario from scratch. We'll build a **Public Speaking Practice** scenario as an example.

## 🎯 What We're Building

A scenario that helps users practice public speaking with different audience types and presentation contexts.

**Features:**
- Presentation topic selection
- Audience type options
- Difficulty level settings
- Custom voice options for different audience personalities

## 📁 File Structure

Scenarios live in the `websocket-server/src/scenarios/` directory:

```
websocket-server/src/scenarios/
├── types.ts              # Type definitions
├── registry.ts           # Scenario registry
├── index.ts              # Initialization
├── job-interview.ts      # Built-in scenario
├── customer-service.ts   # Built-in scenario
└── public-speaking.ts    # Our new scenario
```

## 🚀 Step 1: Create the Scenario File

Create `websocket-server/src/scenarios/public-speaking.ts`:

```typescript
import { CallScenario } from './types';

export const publicSpeakingScenario: CallScenario = {
  id: 'public-speaking',
  name: 'Public Speaking Practice',
  description: 'Practice presentations and speeches with different audiences',
  icon: '🎤',
  
  schema: {
    id: 'public-speaking',
    name: 'Public Speaking Practice',
    description: 'Practice presentations and speeches with different audiences',
    icon: '🎤',
    fields: [
      {
        key: 'presentationType',
        label: 'Presentation Type',
        type: 'select',
        required: true,
        placeholder: 'What type of presentation?',
        options: [
          { value: 'business-pitch', label: 'Business Pitch' },
          { value: 'conference-talk', label: 'Conference Talk' },
          { value: 'wedding-speech', label: 'Wedding Speech' },
          { value: 'academic-presentation', label: 'Academic Presentation' },
          { value: 'product-demo', label: 'Product Demo' }
        ],
        validation: {
          minLength: 1
        }
      },
      {
        key: 'audienceType',
        label: 'Audience Type',
        type: 'select',
        required: true,
        options: [
          { value: 'supportive', label: 'Supportive & Encouraging' },
          { value: 'professional', label: 'Professional & Neutral' },
          { value: 'skeptical', label: 'Skeptical & Questioning' },
          { value: 'expert', label: 'Expert & Knowledgeable' },
          { value: 'distracted', label: 'Distracted & Impatient' }
        ]
      },
      {
        key: 'difficulty',
        label: 'Difficulty Level',
        type: 'select',
        required: false,
        options: [
          { value: 'easy', label: 'Easy - Friendly Audience' },
          { value: 'medium', label: 'Medium - Mixed Reactions' },
          { value: 'hard', label: 'Hard - Challenging Questions' }
        ]
      },
      {
        key: 'presentationTopic',
        label: 'Presentation Topic',
        type: 'text',
        required: true,
        placeholder: 'e.g., Climate Change Solutions, New Marketing Strategy',
        validation: {
          minLength: 5,
          maxLength: 200
        }
      },
      {
        key: 'speakerName',
        label: 'Your Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Alex Johnson, Dr. Smith',
        validation: {
          minLength: 2,
          maxLength: 100
        }
      }
    ],
    voiceOptions: [
      { 
        value: 'ash', 
        label: 'Ashley - Professional Audience', 
        description: 'Neutral, business-focused tone' 
      },
      { 
        value: 'ballad', 
        label: 'Blake - Supportive Listener', 
        description: 'Warm, encouraging audience member' 
      },
      { 
        value: 'coral', 
        label: 'Coral - Engaged Participant', 
        description: 'Active, questioning audience member' 
      },
      { 
        value: 'sage', 
        label: 'Sage - Expert Evaluator', 
        description: 'Knowledgeable, analytical listener' 
      }
    ]
  },

  generateInstructions: (config) => {
    const { presentationType, audienceType, difficulty, presentationTopic, speakerName } = config;
    
    const audiencePersonas = {
      'supportive': 'You are an encouraging audience member who wants the speaker to succeed. Ask helpful questions and provide positive feedback.',
      'professional': 'You are a professional audience member who listens attentively and asks relevant, constructive questions.',
      'skeptical': 'You are somewhat skeptical and need convincing. Ask challenging questions about claims and evidence.',
      'expert': 'You are knowledgeable about the topic and ask detailed, technical questions to test the speaker\'s expertise.',
      'distracted': 'You are somewhat distracted and impatient. Ask for clarification and want the speaker to get to the point quickly.'
    };

    const difficultyModifiers = {
      'easy': 'You are generally receptive and ask straightforward questions.',
      'medium': 'You have some concerns and follow-up questions, but remain engaged.',
      'hard': 'You ask tough questions and challenge assumptions. Be demanding but fair.'
    };

    return `You are an audience member listening to ${speakerName} present about ${presentationTopic} in a ${presentationType} setting.

AUDIENCE PERSONA: ${audiencePersonas[audienceType] || audiencePersonas['professional']}

DIFFICULTY LEVEL: ${difficultyModifiers[difficulty || 'medium']}

PRESENTATION CONTEXT:
- The speaker is presenting about: ${presentationTopic}
- This is a ${presentationType} presentation
- You are part of the audience and may ask questions
- Respond naturally as this type of audience member would
- Show appropriate interest or concern based on your persona
- Ask relevant questions during or after the presentation

GUIDELINES:
- Listen to the presentation and respond authentically
- Ask questions that your persona would ask
- Provide feedback appropriate to the setting
- Challenge points when it fits your character
- Be realistic about your level of engagement
- End the interaction naturally when appropriate

Remember: You are an AUDIENCE MEMBER, not the presenter. Let them lead the presentation while you respond as your character would.`;
  },

  generateGreeting: (config) => {
    const timeOfDay = new Date().getHours();
    const greeting = timeOfDay < 12 ? 'Good morning' : 
                    timeOfDay < 17 ? 'Good afternoon' : 'Good evening';
    
    if (config.audienceType === 'supportive') {
      return `${greeting} ${config.speakerName}! We're excited to hear your ${config.presentationType}.`;
    } else if (config.audienceType === 'expert') {
      return `${greeting}. I'm looking forward to your presentation on ${config.presentationTopic}.`;
    } else {
      return `${greeting}! Ready when you are.`;
    }
  },

  validateConfig: (config) => {
    const errors: string[] = [];
    
    if (!config.presentationType) {
      errors.push('Presentation type is required');
    }
    
    if (!config.audienceType) {
      errors.push('Audience type is required');
    }
    
    if (!config.presentationTopic || config.presentationTopic.length < 5) {
      errors.push('Presentation topic must be at least 5 characters');
    }
    
    if (!config.speakerName || config.speakerName.length < 2) {
      errors.push('Speaker name must be at least 2 characters');
    }
    
    return errors;
  }
};
```

## 🔧 Step 2: Register the Scenario

Add your scenario to `websocket-server/src/scenarios/index.ts`:

```typescript
import { ScenarioRegistry } from './registry';
import { jobInterviewScenario } from './job-interview';
import { customerServiceScenario } from './customer-service';
import { publicSpeakingScenario } from './public-speaking'; // Add this import

export function initializeScenarios(): ScenarioRegistry {
  const registry = new ScenarioRegistry();
  
  // Register built-in scenarios
  registry.register(jobInterviewScenario);
  registry.register(customerServiceScenario);
  registry.register(publicSpeakingScenario); // Add this line
  
  console.log(`📋 Initialized ${registry.getAll().length} scenarios`);
  
  return registry;
}

export { ScenarioRegistry };
export * from './types';
```

## 🧪 Step 3: Test Your Scenario

1. **Start the development server:**
   ```bash
   cd websocket-server
   npm run dev
   ```

2. **Check the logs** for your scenario being loaded:
   ```
   📋 Initialized 3 scenarios
   📋 Registered scenario: public-speaking
   ```

3. **Test the API endpoint:**
   ```bash
   curl http://localhost:8081/scenarios
   ```

4. **Start the frontend** and verify your scenario appears in the dropdown:
   ```bash
   cd webapp
   npm run dev
   ```

## 🎨 Step 4: Customize the Schema

### Field Types

The scenario system supports various field types:

```typescript
// Text input
{
  key: 'name',
  label: 'Full Name',
  type: 'text',
  required: true,
  placeholder: 'Enter your name',
  validation: {
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-zA-Z\\s]+$' // Only letters and spaces
  }
}

// Textarea for longer text
{
  key: 'description',
  label: 'Description',
  type: 'textarea',
  required: false,
  placeholder: 'Provide details...',
  validation: {
    maxLength: 1000
  }
}

// Dropdown selection
{
  key: 'category',
  label: 'Category',
  type: 'select',
  required: true,
  options: [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]
}

// Number input
{
  key: 'budget',
  label: 'Budget',
  type: 'number',
  required: false,
  placeholder: '10000',
  validation: {
    min: 0,
    max: 1000000
  }
}

// Boolean (Yes/No)
{
  key: 'hasExperience',
  label: 'Has Previous Experience',
  type: 'boolean',
  required: true
}
```

### Voice Options

Customize voice options for your scenario:

```typescript
voiceOptions: [
  { 
    value: 'ash', 
    label: 'Ashley - Professional', 
    description: 'Neutral, business-focused tone' 
  },
  { 
    value: 'ballad', 
    label: 'Blake - Casual', 
    description: 'Relaxed, friendly approach' 
  },
  { 
    value: 'coral', 
    label: 'Coral - Energetic', 
    description: 'Enthusiastic and engaging' 
  }
]
```

## 🧠 Step 5: Advanced Instructions

### Dynamic Instructions

Make your AI behavior adapt to user configuration:

```typescript
generateInstructions: (config) => {
  let instructions = `You are a ${config.role} in a ${config.scenario} scenario.`;
  
  // Add conditional behavior
  if (config.difficulty === 'hard') {
    instructions += ' Be challenging and ask tough questions.';
  } else if (config.difficulty === 'easy') {
    instructions += ' Be supportive and encouraging.';
  }
  
  // Add context-specific details
  if (config.industry === 'healthcare') {
    instructions += ' Use appropriate medical terminology and show concern for patient care.';
  }
  
  return instructions;
}
```

### Context-Aware Greetings

Create greetings that match the scenario:

```typescript
generateGreeting: (config) => {
  const timeOfDay = new Date().getHours();
  const greeting = timeOfDay < 12 ? 'Good morning' : 
                  timeOfDay < 17 ? 'Good afternoon' : 'Good evening';
  
  if (config.audienceType === 'supportive') {
    return `${greeting} ${config.speakerName}! We're excited to hear your ${config.presentationType}.`;
  } else if (config.audienceType === 'expert') {
    return `${greeting}. I'm looking forward to your presentation on ${config.presentationTopic}.`;
  } else {
    return `${greeting}! Ready when you are.`;
  }
}
```

## ✅ Step 6: Validation

Add robust validation to ensure quality user input:

```typescript
validateConfig: (config) => {
  const errors: string[] = [];
  
  // Required field validation
  if (!config.requiredField) {
    errors.push('Required field is missing');
  }
  
  // Custom business logic validation
  if (config.budget && config.budget < 1000) {
    errors.push('Budget must be at least $1,000');
  }
  
  // Cross-field validation
  if (config.experience === 'senior' && !config.yearsExperience) {
    errors.push('Years of experience required for senior level');
  }
  
  return errors;
}
```

## 🚀 Step 7: Deploy and Share

Once your scenario is working:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add public speaking practice scenario"
   ```

2. **Push to your repository:**
   ```bash
   git push origin main
   ```

3. **Deploy** using your preferred method (the scenario will be automatically included)

## 🎯 Best Practices

### 1. Clear Field Labels
```typescript
// Good
{ key: 'targetAudience', label: 'Target Audience', placeholder: 'e.g., Small business owners, Enterprise CTOs' }

// Avoid
{ key: 'ta', label: 'TA', placeholder: 'audience' }
```

### 2. Helpful Placeholders
```typescript
// Good
placeholder: 'e.g., Increase sales by 20%, Reduce customer churn'

// Avoid
placeholder: 'Enter objective'
```

### 3. Logical Field Order
```typescript
fields: [
  // Start with the most important/defining fields
  { key: 'scenarioType', ... },
  { key: 'primaryGoal', ... },
  
  // Then supporting details
  { key: 'additionalContext', ... },
  { key: 'difficultyLevel', ... }
]
```

### 4. Comprehensive Instructions
```typescript
generateInstructions: (config) => {
  return `
    ROLE: You are a ${config.role}
    CONTEXT: ${config.context}
    BEHAVIOR: ${config.behaviorGuidelines}
    OBJECTIVES: ${config.objectives}
    CONSTRAINTS: ${config.constraints}
  `;
}
```

## 🐛 Troubleshooting

### Scenario Not Appearing
1. Check the console for registration errors
2. Verify the scenario is imported in `index.ts`
3. Ensure the scenario ID is unique

### Validation Errors
1. Check the `validateConfig` function
2. Verify all required fields are defined
3. Test with minimal configuration first

### AI Behavior Issues
1. Review the `generateInstructions` output
2. Test with different configurations
3. Add more specific behavioral guidelines

## 🎉 Next Steps

Congratulations! You've created your first scenario. Here are some ideas for enhancement:

- **Add more field types** (date, time, file upload)
- **Create scenario variants** (easy/medium/hard versions)
- **Add scenario-specific analytics** 
- **Build scenario templates** for common use cases
- **Create scenario collections** for related training modules

Check out our [Best Practices Guide](./best-practices.md) and [Example Scenarios](./examples.md) for more inspiration! 