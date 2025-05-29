import { ScenarioSchema } from '@/components/scenario-configuration';

const API_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL || 
  (typeof window !== 'undefined' && 
   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.protocol}//localhost:8081`
    : '');

// Environment variable to control which scenarios are shown
const ALLOWED_SCENARIOS = process.env.NEXT_PUBLIC_ALLOWED_SCENARIOS;

export class ScenarioService {
  private static instance: ScenarioService;
  private scenarios: ScenarioSchema[] = [];
  private isLoading = false;
  private lastFetch = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ScenarioService {
    if (!ScenarioService.instance) {
      ScenarioService.instance = new ScenarioService();
    }
    return ScenarioService.instance;
  }

  private filterScenarios(scenarios: ScenarioSchema[]): ScenarioSchema[] {
    // If no filter is specified, return all scenarios
    if (!ALLOWED_SCENARIOS) {
      return scenarios;
    }

    // Parse the allowed scenarios (comma-separated list)
    const allowedIds = ALLOWED_SCENARIOS.split(',').map(id => id.trim()).filter(Boolean);
    
    // Filter scenarios to only include allowed ones
    const filtered = scenarios.filter(scenario => allowedIds.includes(scenario.id));
    
    console.log(`🔍 Scenario filtering enabled. Allowed: [${allowedIds.join(', ')}], Found: [${filtered.map(s => s.id).join(', ')}]`);
    
    return filtered;
  }

  async getScenarios(): Promise<ScenarioSchema[]> {
    const now = Date.now();
    
    // Return cached scenarios if they're still fresh
    if (this.scenarios.length > 0 && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.scenarios;
    }

    // Prevent multiple simultaneous requests
    if (this.isLoading) {
      // Wait for the current request to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.scenarios;
    }

    this.isLoading = true;

    try {
      const response = await fetch(`${API_BASE_URL}/scenarios`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch scenarios: ${response.status} ${response.statusText}`);
      }

      const allScenarios: ScenarioSchema[] = await response.json();
      
      // Validate the response structure
      if (!Array.isArray(allScenarios)) {
        throw new Error('Invalid response format: expected array of scenarios');
      }

      // Basic validation of scenario structure
      allScenarios.forEach((scenario, index) => {
        if (!scenario.id || !scenario.name || !Array.isArray(scenario.fields)) {
          throw new Error(`Invalid scenario at index ${index}: missing required fields`);
        }
      });

      // Apply scenario filtering based on environment variable
      const filteredScenarios = this.filterScenarios(allScenarios);

      this.scenarios = filteredScenarios;
      this.lastFetch = now;
      
      console.log(`📋 Loaded ${filteredScenarios.length} scenarios:`, filteredScenarios.map(s => s.name));
      
      return filteredScenarios;
    } catch (error) {
      console.error('❌ Error fetching scenarios:', error);
      
      // Return fallback scenarios if API is unavailable
      const fallbackScenarios: ScenarioSchema[] = [
        {
          id: 'job-interview',
          name: 'Job Interview Practice',
          description: 'Practice phone interviews with AI for specific job positions',
          icon: '💼',
          fields: [
            {
              key: 'jobTitle',
              label: 'Job Title',
              type: 'text',
              required: true,
              placeholder: 'e.g., Software Engineer, Product Manager',
              validation: { minLength: 2, maxLength: 100 }
            },
            {
              key: 'company',
              label: 'Company',
              type: 'text',
              required: true,
              placeholder: 'e.g., Google, Microsoft, Startup Inc.',
              validation: { minLength: 2, maxLength: 100 }
            },
            {
              key: 'jobDescription',
              label: 'Job Description',
              type: 'textarea',
              required: false,
              placeholder: 'Paste the job description here or provide key requirements...',
              validation: { maxLength: 5000 }
            }
          ],
          voiceOptions: [
            { value: 'ash', label: 'Ashley', description: 'Neutral, balanced tone' },
            { value: 'ballad', label: 'Blake', description: 'Male voice, friendly' },
            { value: 'coral', label: 'Coral', description: 'Female voice, warm' },
            { value: 'sage', label: 'Sage', description: 'Professional, clear' },
            { value: 'verse', label: 'Victoria', description: 'Female voice, energetic' }
          ]
        }
      ];

      // Apply filtering to fallback scenarios as well
      const filteredFallback = this.filterScenarios(fallbackScenarios);

      console.log('📋 Using fallback scenarios due to API error');
      this.scenarios = filteredFallback;
      this.lastFetch = now;
      
      return filteredFallback;
    } finally {
      this.isLoading = false;
    }
  }

  async getScenario(scenarioId: string): Promise<ScenarioSchema | undefined> {
    const scenarios = await this.getScenarios();
    return scenarios.find(s => s.id === scenarioId);
  }

  clearCache(): void {
    this.scenarios = [];
    this.lastFetch = 0;
  }
}

export const scenarioService = ScenarioService.getInstance(); 