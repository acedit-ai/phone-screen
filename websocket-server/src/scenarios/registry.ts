import { CallScenario } from './types';

class ScenarioRegistry {
  private scenarios = new Map<string, CallScenario>();

  register(scenario: CallScenario): void {
    console.log(`📋 Registering scenario: ${scenario.schema.id} - ${scenario.schema.name}`);
    this.scenarios.set(scenario.schema.id, scenario);
  }

  get(scenarioId: string): CallScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  getAll(): CallScenario[] {
    return Array.from(this.scenarios.values());
  }

  getAllSchemas() {
    return Array.from(this.scenarios.values()).map(scenario => scenario.schema);
  }

  exists(scenarioId: string): boolean {
    return this.scenarios.has(scenarioId);
  }

  getDefaultScenario(): CallScenario | undefined {
    // Return the first registered scenario as default
    return Array.from(this.scenarios.values())[0];
  }
}

// Global registry instance
export const scenarioRegistry = new ScenarioRegistry();

// Helper function to get scenario or throw error
export function getScenario(scenarioId: string): CallScenario {
  const scenario = scenarioRegistry.get(scenarioId);
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }
  return scenario;
} 