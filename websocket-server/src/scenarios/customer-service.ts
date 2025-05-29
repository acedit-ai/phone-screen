import dedent from "dedent";
import { CallScenario, CallScenarioConfig, ScenarioSchema } from './types';

// Customer service specific configuration interface
interface CustomerServiceConfig extends CallScenarioConfig {
  companyName: string;
  serviceType?: string;
  supportLevel?: 'basic' | 'premium' | 'enterprise';
}

const customerServiceSchema: ScenarioSchema = {
  id: 'customer-service',
  name: 'Customer Service Bot',
  description: 'AI-powered customer service representative for handling support calls',
  icon: '🎧',
  fields: [
    {
      key: 'companyName',
      label: 'Company Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Acme Corp, TechStart Inc.',
      validation: {
        minLength: 2,
        maxLength: 100
      }
    },
    {
      key: 'serviceType',
      label: 'Service Type',
      type: 'select',
      required: false,
      options: [
        { value: 'technical', label: 'Technical Support' },
        { value: 'billing', label: 'Billing & Accounts' },
        { value: 'general', label: 'General Inquiries' },
        { value: 'sales', label: 'Sales Support' }
      ]
    },
    {
      key: 'supportLevel',
      label: 'Support Level',
      type: 'select',
      required: false,
      options: [
        { value: 'basic', label: 'Basic Support' },
        { value: 'premium', label: 'Premium Support' },
        { value: 'enterprise', label: 'Enterprise Support' }
      ]
    }
  ],
  voiceOptions: [
    { value: 'ash', label: 'Alex', description: 'Neutral, professional tone' },
    { value: 'coral', label: 'Coral', description: 'Warm, friendly female voice' },
    { value: 'sage', label: 'Sam', description: 'Clear, helpful tone' }
  ]
};

function generateInstructions(config: CallScenarioConfig, voice?: string): string {
  const serviceConfig = config as CustomerServiceConfig;
  const companyName = serviceConfig.companyName || "our company";
  const serviceType = serviceConfig.serviceType || "general support";
  const supportLevel = serviceConfig.supportLevel || "standard";
  
  // Map voice to agent name
  const agentName = voice === 'coral' ? 'Sarah' : voice === 'sage' ? 'Sam' : 'Alex';

  return dedent`
    You are ${agentName}, a professional customer service representative for ${companyName}. You are handling a ${serviceType} call with ${supportLevel} service level.

    Your role is to:
    1. Greet the customer warmly and introduce yourself: "Hello! Thank you for calling ${companyName}. My name is ${agentName}, and I'm here to help you today."
    2. Ask how you can assist them and listen carefully to their needs
    3. Provide helpful, accurate information about products, services, or policies
    4. Handle complaints with empathy and professionalism
    5. Escalate complex issues when appropriate
    6. Ensure customer satisfaction before ending the call

    Customer Service Guidelines:
    - Always maintain a friendly, professional tone
    - Listen actively and ask clarifying questions
    - Apologize sincerely for any inconvenience
    - Offer specific solutions or next steps
    - Thank the customer for their business
    - Keep responses concise but thorough

    Remember: You represent ${companyName} and should always act in the customer's best interest while following company policies. Your goal is to resolve their issue and leave them satisfied with the service.

    Begin by greeting the customer and asking how you can help them today.
  `;
}

function generateInitialGreeting(config: CallScenarioConfig): string {
  return "Hello, I just answered the customer service line. Please greet the customer and ask how I can help them.";
}

function validateConfig(config: CallScenarioConfig): { isValid: boolean; errors: string[] } {
  const serviceConfig = config as CustomerServiceConfig;
  const errors: string[] = [];

  if (!serviceConfig.companyName || serviceConfig.companyName.trim().length < 2) {
    errors.push('Company name is required and must be at least 2 characters');
  }

  if (serviceConfig.companyName && serviceConfig.companyName.length > 100) {
    errors.push('Company name must be less than 100 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function shouldAutoStart(config: CallScenarioConfig): boolean {
  const serviceConfig = config as CustomerServiceConfig;
  return !!(serviceConfig.companyName);
}

export const customerServiceScenario: CallScenario = {
  schema: customerServiceSchema,
  generateInstructions,
  generateInitialGreeting,
  validateConfig,
  shouldAutoStart
}; 