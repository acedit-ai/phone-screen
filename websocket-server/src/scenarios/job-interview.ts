import dedent from "dedent";
import { CallScenario, CallScenarioConfig, ScenarioSchema } from './types';

// Job interview specific configuration interface
interface JobInterviewConfig extends CallScenarioConfig {
  jobTitle: string;
  company: string;
  jobDescription?: string;
}

// Helper function to convert voice names to proper interviewer names
function getInterviewerName(voice?: string): string {
  if (!voice) return "Ashley"; // Default fallback
  
  // Capitalize first letter and use as name
  const capitalizedVoice = voice.charAt(0).toUpperCase() + voice.slice(1);
  
  // Map voice names to professional interviewer names
  const nameMap: { [key: string]: string } = {
    'Ash': 'Ashley',
    'Ballad': 'Blake',
    'Coral': 'Coral',
    'Sage': 'Sage',
    'Verse': 'Victoria'
  };
  
  return nameMap[capitalizedVoice] || capitalizedVoice;
}

const jobInterviewSchema: ScenarioSchema = {
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
      validation: {
        minLength: 2,
        maxLength: 100
      }
    },
    {
      key: 'company',
      label: 'Company',
      type: 'text',
      required: true,
      placeholder: 'e.g., Google, Microsoft, Startup Inc.',
      validation: {
        minLength: 2,
        maxLength: 100
      }
    },
    {
      key: 'jobDescription',
      label: 'Job Description',
      type: 'textarea',
      required: false,
      placeholder: 'Paste the job description here or provide key requirements and responsibilities...',
      validation: {
        maxLength: 5000
      }
    }
  ],
  voiceOptions: [
    { value: 'ash', label: 'Ashley', description: 'Neutral, balanced tone' },
    { value: 'ballad', label: 'Blake', description: 'Male voice, friendly' },
    { value: 'coral', label: 'Coral', description: 'Female voice, warm' },
    { value: 'sage', label: 'Sage', description: 'Professional, clear' },
    { value: 'verse', label: 'Victoria', description: 'Female voice, energetic' }
  ]
};

function generateInstructions(config: CallScenarioConfig, voice?: string): string {
  const jobConfig = config as JobInterviewConfig;
  const jobTitle = jobConfig.jobTitle || "this position";
  const company = jobConfig.company || "the company";
  const jobDescription = jobConfig.jobDescription || "";
  const interviewerName = getInterviewerName(voice);

  let baseInstructions = dedent`
    You are ${interviewerName}, a professional AI phone interviewer conducting a technical phone screening. You are interviewing a candidate for the role of ${jobTitle} at ${company}.

    Your role is to:
    1. Start with a warm, professional greeting and introduce yourself by name: "Hello! Thank you for taking the time to speak with me today. My name is ${interviewerName}, and I'm conducting this phone screening for the ${jobTitle} position at ${company}."
    2. Ask if they're ready to begin and if they have any questions before starting
    3. Conduct a comprehensive interview covering:
       - Background and experience relevant to the role
       - Technical skills and knowledge
       - Problem-solving abilities
       - Cultural fit and motivation
       - Questions about their interest in ${company}
    4. Ask thoughtful follow-up questions based on their responses
    5. Keep the conversation focused and professional
    6. The interview should last 10-15 minutes
    7. Be encouraging but thorough in your evaluation

    Interview Guidelines:
    - Ask open-ended questions that allow the candidate to demonstrate their expertise
    - Listen carefully and ask relevant follow-up questions
    - Maintain a professional but friendly tone
    - Cover both technical and behavioral aspects
    - End with asking if they have any questions for you

    Remember: You are ${interviewerName}. Always refer to yourself by this name when introducing yourself or when the candidate asks who they're speaking with.
  `;

  // Add specific job description context if available
  if (jobDescription.trim()) {
    baseInstructions += dedent`

      Job Context:
      ${jobDescription.trim()}

      Use this job description to tailor your questions to the specific requirements and responsibilities mentioned.
    `;
  }

  baseInstructions += dedent`

    Begin by greeting the candidate and introducing yourself as ${interviewerName}, then explain the purpose of the call. Ask them if they're ready to start the interview, then proceed with your questions. Make this feel like a real, professional interview experience.
  `;

  return baseInstructions;
}

function generateInitialGreeting(config: CallScenarioConfig): string {
  return "Hello, I just answered the phone. Please start the interview.";
}

function validateConfig(config: CallScenarioConfig): { isValid: boolean; errors: string[] } {
  const jobConfig = config as JobInterviewConfig;
  const errors: string[] = [];

  if (!jobConfig.jobTitle || jobConfig.jobTitle.trim().length < 2) {
    errors.push('Job title is required and must be at least 2 characters');
  }

  if (!jobConfig.company || jobConfig.company.trim().length < 2) {
    errors.push('Company name is required and must be at least 2 characters');
  }

  if (jobConfig.jobTitle && jobConfig.jobTitle.length > 100) {
    errors.push('Job title must be less than 100 characters');
  }

  if (jobConfig.company && jobConfig.company.length > 100) {
    errors.push('Company name must be less than 100 characters');
  }

  if (jobConfig.jobDescription && jobConfig.jobDescription.length > 5000) {
    errors.push('Job description must be less than 5000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function shouldAutoStart(config: CallScenarioConfig): boolean {
  const jobConfig = config as JobInterviewConfig;
  return !!(jobConfig.jobTitle && jobConfig.company);
}

export const jobInterviewScenario: CallScenario = {
  schema: jobInterviewSchema,
  generateInstructions,
  generateInitialGreeting,
  validateConfig,
  getInterviewerName,
  shouldAutoStart
}; 