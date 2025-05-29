// Test file to verify scenario filtering functionality
// This would typically be run with Jest or similar testing framework

import { ScenarioSchema } from '@/components/scenario-configuration';

// Mock scenarios for testing
const mockScenarios: ScenarioSchema[] = [
  {
    id: 'job-interview',
    name: 'Job Interview Practice',
    description: 'Practice phone interviews with AI',
    icon: '💼',
    fields: [],
    voiceOptions: []
  },
  {
    id: 'customer-service',
    name: 'Customer Service Training',
    description: 'Practice customer service calls',
    icon: '📞',
    fields: [],
    voiceOptions: []
  },
  {
    id: 'public-speaking',
    name: 'Public Speaking Practice',
    description: 'Practice presentations and speeches',
    icon: '🎤',
    fields: [],
    voiceOptions: []
  }
];

// Simulate the filtering logic from ScenarioService
function filterScenarios(scenarios: ScenarioSchema[], allowedScenarios?: string): ScenarioSchema[] {
  // If no filter is specified, return all scenarios
  if (!allowedScenarios) {
    return scenarios;
  }

  // Parse the allowed scenarios (comma-separated list)
  const allowedIds = allowedScenarios.split(',').map(id => id.trim()).filter(Boolean);
  
  // Filter scenarios to only include allowed ones
  const filtered = scenarios.filter(scenario => allowedIds.includes(scenario.id));
  
  console.log(`🔍 Scenario filtering enabled. Allowed: [${allowedIds.join(', ')}], Found: [${filtered.map(s => s.id).join(', ')}]`);
  
  return filtered;
}

// Test cases
console.log('=== Scenario Filtering Tests ===\n');

// Test 1: No filtering (show all scenarios)
console.log('Test 1: No filtering');
const result1 = filterScenarios(mockScenarios);
console.log(`Expected: 3 scenarios, Got: ${result1.length}`);
console.log(`Scenarios: ${result1.map(s => s.id).join(', ')}\n`);

// Test 2: Single scenario filtering (job interview only)
console.log('Test 2: Job interview only');
const result2 = filterScenarios(mockScenarios, 'job-interview');
console.log(`Expected: 1 scenario, Got: ${result2.length}`);
console.log(`Scenarios: ${result2.map(s => s.id).join(', ')}\n`);

// Test 3: Multiple scenario filtering
console.log('Test 3: Multiple scenarios');
const result3 = filterScenarios(mockScenarios, 'job-interview,customer-service');
console.log(`Expected: 2 scenarios, Got: ${result3.length}`);
console.log(`Scenarios: ${result3.map(s => s.id).join(', ')}\n`);

// Test 4: Non-existent scenario
console.log('Test 4: Non-existent scenario');
const result4 = filterScenarios(mockScenarios, 'non-existent');
console.log(`Expected: 0 scenarios, Got: ${result4.length}`);
console.log(`Scenarios: ${result4.map(s => s.id).join(', ')}\n`);

// Test 5: Mixed valid and invalid scenarios
console.log('Test 5: Mixed valid and invalid');
const result5 = filterScenarios(mockScenarios, 'job-interview,non-existent,customer-service');
console.log(`Expected: 2 scenarios, Got: ${result5.length}`);
console.log(`Scenarios: ${result5.map(s => s.id).join(', ')}\n`);

console.log('=== Environment Variable Examples ===\n');
console.log('For job interview phone screening deployment:');
console.log('NEXT_PUBLIC_ALLOWED_SCENARIOS=job-interview\n');

console.log('For multi-scenario training platform:');
console.log('NEXT_PUBLIC_ALLOWED_SCENARIOS=job-interview,customer-service,public-speaking\n');

console.log('For development (all scenarios):');
console.log('# NEXT_PUBLIC_ALLOWED_SCENARIOS= (commented out or not set)\n');

export { filterScenarios }; 