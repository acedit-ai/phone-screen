import { scenarioRegistry } from './registry';
import { jobInterviewScenario } from './job-interview';
import { customerServiceScenario } from './customer-service';

// Register all available scenarios
export function initializeScenarios() {
  console.log('🚀 Initializing call scenarios...');
  
  // Register the job interview scenario
  scenarioRegistry.register(jobInterviewScenario);
  
  // Register the customer service scenario
  scenarioRegistry.register(customerServiceScenario);
  
  console.log(`✅ Registered ${scenarioRegistry.getAll().length} scenario(s)`);
}

// Re-export everything for easy access
export * from './types';
export * from './registry';
export { jobInterviewScenario, customerServiceScenario }; 