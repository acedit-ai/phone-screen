export interface CallScenarioConfig {
  [key: string]: any;
}

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

export interface CallScenario {
  schema: ScenarioSchema;
  generateInstructions: (config: CallScenarioConfig, voice?: string) => string;
  generateInitialGreeting?: (config: CallScenarioConfig) => string;
  validateConfig: (config: CallScenarioConfig) => { isValid: boolean; errors: string[] };
  getInterviewerName?: (voice?: string) => string;
  shouldAutoStart?: (config: CallScenarioConfig) => boolean;
}

export interface ScenarioSession {
  scenarioId: string;
  config: CallScenarioConfig;
  voice?: string;
  isRateLimited?: boolean;
  rateLimitReason?: string;
  initialGreetingPrompts?: Set<string>;
} 