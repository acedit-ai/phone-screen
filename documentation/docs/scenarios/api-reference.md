# Scenario API Reference

Complete reference for all interfaces, types, and methods in the scenario system.

## 🏗️ Core Interfaces

### CallScenario

The main interface that defines a complete scenario.

```typescript
interface CallScenario {
  id: string;
  name: string;
  description: string;
  icon?: string;
  schema: ScenarioSchema;
  generateInstructions: (config: ScenarioConfig) => string;
  generateGreeting: (config: ScenarioConfig) => string;
  validateConfig?: (config: ScenarioConfig) => string[];
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier for the scenario |
| `name` | `string` | ✅ | Display name shown in UI |
| `description` | `string` | ✅ | Brief description of the scenario |
| `icon` | `string` | ❌ | Emoji or icon for visual identification |
| `schema` | `ScenarioSchema` | ✅ | Configuration schema and metadata |
| `generateInstructions` | `function` | ✅ | Function to create AI instructions |
| `generateGreeting` | `function` | ✅ | Function to create opening message |
| `validateConfig` | `function` | ❌ | Custom validation logic |

### ScenarioSchema

Defines the configuration interface and metadata for a scenario.

```typescript
interface ScenarioSchema {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fields: ScenarioField[];
  voiceOptions?: VoiceOption[];
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ | Must match the scenario ID |
| `name` | `string` | ✅ | Display name |
| `description` | `string` | ✅ | Scenario description |
| `icon` | `string` | ❌ | Visual identifier |
| `fields` | `ScenarioField[]` | ✅ | Configuration fields |
| `voiceOptions` | `VoiceOption[]` | ❌ | Available voice choices |

### ScenarioField

Defines a single configuration field in the scenario.

```typescript
interface ScenarioField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean';
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  validation?: FieldValidation;
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | ✅ | Unique field identifier |
| `label` | `string` | ✅ | Display label for the field |
| `type` | `FieldType` | ✅ | Input type (see Field Types) |
| `required` | `boolean` | ❌ | Whether field is required (default: false) |
| `placeholder` | `string` | ❌ | Placeholder text for input |
| `options` | `FieldOption[]` | ❌ | Options for select fields |
| `validation` | `FieldValidation` | ❌ | Validation rules |

### FieldValidation

Validation rules for scenario fields.

```typescript
interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `minLength` | `number` | Minimum string length |
| `maxLength` | `number` | Maximum string length |
| `min` | `number` | Minimum numeric value |
| `max` | `number` | Maximum numeric value |
| `pattern` | `string` | Regular expression pattern |

### FieldOption

Option for select-type fields.

```typescript
interface FieldOption {
  value: string;
  label: string;
}
```

### VoiceOption

Available voice choice for a scenario.

```typescript
interface VoiceOption {
  value: string;
  label: string;
  description?: string;
}
```

### ScenarioConfig

User-provided configuration for a scenario instance.

```typescript
interface ScenarioConfig {
  [key: string]: any;
}
```

**Note:** The actual shape depends on the scenario's field definitions.

## 🎛️ Field Types

### text

Single-line text input.

```typescript
{
  key: 'name',
  label: 'Full Name',
  type: 'text',
  required: true,
  placeholder: 'Enter your name',
  validation: {
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-zA-Z\\s]+$'
  }
}
```

**Validation Options:**
- `minLength`: Minimum character count
- `maxLength`: Maximum character count  
- `pattern`: Regular expression validation

### textarea

Multi-line text input.

```typescript
{
  key: 'description',
  label: 'Description',
  type: 'textarea',
  placeholder: 'Provide details...',
  validation: {
    maxLength: 1000
  }
}
```

**Validation Options:**
- `minLength`: Minimum character count
- `maxLength`: Maximum character count

### select

Dropdown selection.

```typescript
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
```

**Required Properties:**
- `options`: Array of `FieldOption` objects

### number

Numeric input.

```typescript
{
  key: 'budget',
  label: 'Budget',
  type: 'number',
  placeholder: '10000',
  validation: {
    min: 0,
    max: 1000000
  }
}
```

**Validation Options:**
- `min`: Minimum value
- `max`: Maximum value

### boolean

Yes/No selection.

```typescript
{
  key: 'hasExperience',
  label: 'Has Previous Experience',
  type: 'boolean',
  required: true
}
```

**Note:** Renders as a dropdown with "Yes" and "No" options.

## 🏭 ScenarioRegistry

Central registry for managing scenarios.

### Methods

#### register(scenario: CallScenario): void

Register a new scenario.

```typescript
const registry = new ScenarioRegistry();
registry.register(myScenario);
```

#### get(id: string): CallScenario | undefined

Retrieve a scenario by ID.

```typescript
const scenario = registry.get('job-interview');
```

#### getAll(): CallScenario[]

Get all registered scenarios.

```typescript
const allScenarios = registry.getAll();
```

#### getSchemas(): ScenarioSchema[]

Get schemas for all scenarios (used by frontend).

```typescript
const schemas = registry.getSchemas();
```

## 🔧 Helper Functions

### generateInstructions(config: ScenarioConfig): string

Generate AI instructions based on user configuration.

**Example Implementation:**

```typescript
generateInstructions: (config) => {
  const { role, difficulty, context } = config;
  
  let instructions = `You are a ${role}.`;
  
  if (difficulty === 'hard') {
    instructions += ' Be challenging and ask tough questions.';
  }
  
  if (context) {
    instructions += ` Context: ${context}`;
  }
  
  return instructions;
}
```

**Best Practices:**
- Use template literals for complex instructions
- Include conditional logic based on configuration
- Provide clear behavioral guidelines
- Specify role, context, and objectives

### generateGreeting(config: ScenarioConfig): string

Generate opening message for the call.

**Example Implementation:**

```typescript
generateGreeting: (config) => {
  const { customerType, companyName } = config;
  
  const greetings = {
    'new': `Hello! Thanks for your interest in ${companyName}.`,
    'existing': `Hi there! Good to hear from you again.`,
    'cold': `Hello, I hope I'm not catching you at a bad time.`
  };
  
  return greetings[customerType] || greetings['new'];
}
```

**Best Practices:**
- Keep greetings natural and contextual
- Use randomization for variety
- Match the scenario's tone and purpose
- Consider time of day or other dynamic factors

### validateConfig(config: ScenarioConfig): string[]

Custom validation logic for scenario configuration.

**Example Implementation:**

```typescript
validateConfig: (config) => {
  const errors: string[] = [];
  
  // Required field validation
  if (!config.requiredField) {
    errors.push('Required field is missing');
  }
  
  // Business logic validation
  if (config.budget && config.budget < 1000) {
    errors.push('Budget must be at least $1,000');
  }
  
  // Cross-field validation
  if (config.level === 'advanced' && !config.experience) {
    errors.push('Experience required for advanced level');
  }
  
  return errors;
}
```

**Return Value:**
- Empty array `[]` if validation passes
- Array of error messages if validation fails

## 🌐 HTTP API Endpoints

### GET /scenarios

Retrieve all available scenario schemas.

**Response:**
```typescript
ScenarioSchema[]
```

**Example:**
```bash
curl http://localhost:8081/scenarios
```

```json
[
  {
    "id": "job-interview",
    "name": "Job Interview Practice",
    "description": "Practice phone interviews with AI",
    "icon": "💼",
    "fields": [...],
    "voiceOptions": [...]
  }
]
```

## 🔌 WebSocket Messages

### scenario.configuration

Send scenario configuration to the server.

**Message Format:**
```typescript
{
  type: "scenario.configuration",
  scenarioId: string,
  config: ScenarioConfig,
  voice: string
}
```

**Example:**
```javascript
ws.send(JSON.stringify({
  type: "scenario.configuration",
  scenarioId: "job-interview",
  config: {
    jobTitle: "Software Engineer",
    company: "Google",
    jobDescription: "..."
  },
  voice: "ash"
}));
```

## 🧪 Testing Utilities

### Scenario Validation

Test scenario configuration:

```typescript
import { validateScenarioConfig } from './test-utils';

const config = { jobTitle: 'Engineer', company: 'Acme' };
const errors = validateScenarioConfig('job-interview', config);

if (errors.length === 0) {
  console.log('Configuration is valid');
} else {
  console.log('Validation errors:', errors);
}
```

### Mock Scenario

Create test scenarios:

```typescript
const mockScenario: CallScenario = {
  id: 'test-scenario',
  name: 'Test Scenario',
  description: 'For testing purposes',
  schema: {
    id: 'test-scenario',
    name: 'Test Scenario',
    description: 'For testing purposes',
    fields: [
      {
        key: 'testField',
        label: 'Test Field',
        type: 'text',
        required: true
      }
    ]
  },
  generateInstructions: () => 'Test instructions',
  generateGreeting: () => 'Test greeting'
};
```

## 🚨 Error Handling

### Common Errors

#### Scenario Not Found
```typescript
// When scenario ID doesn't exist
const scenario = registry.get('non-existent');
// Returns: undefined
```

#### Invalid Configuration
```typescript
// When required fields are missing
const errors = scenario.validateConfig({});
// Returns: ['Field X is required', 'Field Y is required']
```

#### Schema Validation
```typescript
// When field types don't match
{
  key: 'age',
  type: 'number',
  value: 'not-a-number' // This will cause validation error
}
```

### Error Response Format

API errors follow this format:

```typescript
{
  error: string;
  details?: any;
  code?: string;
}
```

## 📝 TypeScript Definitions

Complete type definitions file:

```typescript
// websocket-server/src/scenarios/types.ts

export interface ScenarioField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ScenarioSchema {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fields: ScenarioField[];
  voiceOptions?: {
    value: string;
    label: string;
    description?: string;
  }[];
}

export interface ScenarioConfig {
  [key: string]: any;
}

export interface CallScenario {
  id: string;
  name: string;
  description: string;
  icon?: string;
  schema: ScenarioSchema;
  generateInstructions: (config: ScenarioConfig) => string;
  generateGreeting: (config: ScenarioConfig) => string;
  validateConfig?: (config: ScenarioConfig) => string[];
}

export interface ScenarioSession {
  scenarioId: string;
  config: ScenarioConfig;
  voice: string;
  instructions?: string;
  greeting?: string;
}
```

This API reference provides complete documentation for building and integrating with the scenario system. For practical examples, see the [Creating Scenarios Guide](./creating-scenarios.md) and [Example Scenarios](./examples.md). 