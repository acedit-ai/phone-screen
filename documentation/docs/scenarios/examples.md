# Example Scenarios

Real-world implementations demonstrating different types of scenarios and use cases.

## 🏥 Healthcare: Medical Consultation

A scenario for healthcare professionals to practice patient communication.

```typescript
// scenarios/medical-consultation.ts
import { CallScenario } from './types';

export const medicalConsultationScenario: CallScenario = {
  id: 'medical-consultation',
  name: 'Medical Consultation Practice',
  description: 'Practice patient communication and consultation skills',
  icon: '🏥',
  
  schema: {
    id: 'medical-consultation',
    name: 'Medical Consultation Practice',
    description: 'Practice patient communication and consultation skills',
    icon: '🏥',
    fields: [
      {
        key: 'specialty',
        label: 'Medical Specialty',
        type: 'select',
        required: true,
        options: [
          { value: 'general', label: 'General Practice' },
          { value: 'cardiology', label: 'Cardiology' },
          { value: 'pediatrics', label: 'Pediatrics' },
          { value: 'psychiatry', label: 'Psychiatry' },
          { value: 'emergency', label: 'Emergency Medicine' }
        ]
      },
      {
        key: 'patientType',
        label: 'Patient Type',
        type: 'select',
        required: true,
        options: [
          { value: 'new', label: 'New Patient - First Visit' },
          { value: 'followup', label: 'Follow-up Appointment' },
          { value: 'urgent', label: 'Urgent Care Visit' },
          { value: 'anxious', label: 'Anxious Patient' },
          { value: 'elderly', label: 'Elderly Patient' }
        ]
      },
      {
        key: 'chiefComplaint',
        label: 'Chief Complaint',
        type: 'text',
        required: true,
        placeholder: 'e.g., Chest pain, Headaches, Annual checkup',
        validation: {
          minLength: 3,
          maxLength: 100
        }
      },
      {
        key: 'patientAge',
        label: 'Patient Age',
        type: 'number',
        required: false,
        placeholder: '45',
        validation: {
          min: 1,
          max: 120
        }
      },
      {
        key: 'communicationStyle',
        label: 'Communication Preference',
        type: 'select',
        required: false,
        options: [
          { value: 'detailed', label: 'Detailed explanations' },
          { value: 'simple', label: 'Simple, easy language' },
          { value: 'direct', label: 'Direct and concise' }
        ]
      }
    ],
    voiceOptions: [
      { 
        value: 'coral', 
        label: 'Coral - Concerned Patient', 
        description: 'Worried but cooperative' 
      },
      { 
        value: 'ash', 
        label: 'Ashley - Calm Patient', 
        description: 'Composed and articulate' 
      },
      { 
        value: 'ballad', 
        label: 'Blake - Elderly Patient', 
        description: 'Slower speech, may need repetition' 
      },
      { 
        value: 'sage', 
        label: 'Sage - Analytical Patient', 
        description: 'Asks detailed questions' 
      }
    ]
  },

  generateInstructions: (config) => {
    const { specialty, patientType, chiefComplaint, patientAge, communicationStyle } = config;
    
    const patientPersonas = {
      'new': 'You are a new patient, somewhat nervous about your first visit. You want to make a good impression but also get your concerns addressed.',
      'followup': 'You are returning for a follow-up appointment. You have some questions about your previous visit and want to understand your progress.',
      'urgent': 'You are seeking urgent care and are concerned about your symptoms. You want quick answers but also thorough care.',
      'anxious': 'You are very worried about your health and tend to ask many questions. You may catastrophize symptoms.',
      'elderly': 'You are an older patient who may need things explained slowly and clearly. You have experience with healthcare but technology might be challenging.'
    };

    const ageContext = patientAge ? ` You are ${patientAge} years old.` : '';
    
    const communicationPrefs = {
      'detailed': 'You prefer detailed explanations and want to understand the medical reasoning.',
      'simple': 'You prefer simple explanations without too much medical jargon.',
      'direct': 'You want direct, to-the-point answers without lengthy explanations.'
    };

    return `You are a patient calling for a ${specialty} consultation about ${chiefComplaint}.${ageContext}

PATIENT PERSONA: ${patientPersonas[patientType] || patientPersonas['new']}

COMMUNICATION STYLE: ${communicationPrefs[communicationStyle] || 'You communicate naturally and ask questions when confused.'}

SCENARIO CONTEXT:
- Chief complaint: ${chiefComplaint}
- This is a phone consultation/telemedicine call
- You may have symptoms, concerns, or questions
- Be realistic about your symptoms and concerns
- Ask appropriate follow-up questions

BEHAVIOR GUIDELINES:
- Describe your symptoms clearly when asked
- Ask questions about diagnosis, treatment, or next steps
- Express any concerns or anxieties you might have
- Be honest about your medical history when relevant
- Show appreciation for clear explanations
- End the call when you feel your concerns are addressed

Remember: You are the PATIENT seeking medical advice. Let the healthcare provider lead the consultation while you respond authentically to their questions and guidance.`;
  },

  generateGreeting: (config) => {
    const { patientType, chiefComplaint } = config;
    
    const greetings = {
      'new': `Hello Doctor, thank you for taking my call. I'm a new patient and I'm calling about ${chiefComplaint}.`,
      'followup': `Hi Doctor, this is a follow-up call about my recent visit. I had some questions about ${chiefComplaint}.`,
      'urgent': `Hello, I need to speak with a doctor about ${chiefComplaint}. I'm quite concerned.`,
      'anxious': `Hi Doctor, I'm really worried about ${chiefComplaint}. Could you please help me?`,
      'elderly': `Hello Doctor, I hope you can hear me clearly. I'm calling about ${chiefComplaint}.`
    };
    
    return greetings[patientType] || greetings['new'];
  },

  validateConfig: (config) => {
    const errors: string[] = [];
    
    if (!config.specialty) {
      errors.push('Medical specialty is required');
    }
    
    if (!config.patientType) {
      errors.push('Patient type is required');
    }
    
    if (!config.chiefComplaint || config.chiefComplaint.length < 3) {
      errors.push('Chief complaint must be at least 3 characters');
    }
    
    if (config.patientAge && (config.patientAge < 1 || config.patientAge > 120)) {
      errors.push('Patient age must be between 1 and 120');
    }
    
    return errors;
  }
};
```

## 🎓 Education: Language Learning

A scenario for practicing conversations in different languages.

```typescript
// scenarios/language-learning.ts
import { CallScenario } from './types';

export const languageLearningScenario: CallScenario = {
  id: 'language-learning',
  name: 'Language Learning Practice',
  description: 'Practice conversational skills in different languages',
  icon: '🎓',
  
  schema: {
    id: 'language-learning',
    name: 'Language Learning Practice',
    description: 'Practice conversational skills in different languages',
    icon: '🎓',
    fields: [
      {
        key: 'language',
        label: 'Target Language',
        type: 'select',
        required: true,
        options: [
          { value: 'spanish', label: 'Spanish (Español)' },
          { value: 'french', label: 'French (Français)' },
          { value: 'german', label: 'German (Deutsch)' },
          { value: 'italian', label: 'Italian (Italiano)' },
          { value: 'portuguese', label: 'Portuguese (Português)' },
          { value: 'mandarin', label: 'Mandarin Chinese (中文)' }
        ]
      },
      {
        key: 'proficiencyLevel',
        label: 'Your Proficiency Level',
        type: 'select',
        required: true,
        options: [
          { value: 'beginner', label: 'Beginner (A1-A2)' },
          { value: 'intermediate', label: 'Intermediate (B1-B2)' },
          { value: 'advanced', label: 'Advanced (C1-C2)' }
        ]
      },
      {
        key: 'conversationTopic',
        label: 'Conversation Topic',
        type: 'select',
        required: true,
        options: [
          { value: 'travel', label: 'Travel & Tourism' },
          { value: 'business', label: 'Business & Professional' },
          { value: 'daily', label: 'Daily Life & Casual' },
          { value: 'academic', label: 'Academic & Educational' },
          { value: 'cultural', label: 'Culture & Traditions' },
          { value: 'shopping', label: 'Shopping & Services' }
        ]
      },
      {
        key: 'scenario',
        label: 'Specific Scenario',
        type: 'text',
        required: false,
        placeholder: 'e.g., Ordering at a restaurant, Job interview, Hotel check-in',
        validation: {
          maxLength: 200
        }
      },
      {
        key: 'focusArea',
        label: 'Focus Area',
        type: 'select',
        required: false,
        options: [
          { value: 'pronunciation', label: 'Pronunciation Practice' },
          { value: 'vocabulary', label: 'Vocabulary Building' },
          { value: 'grammar', label: 'Grammar Application' },
          { value: 'fluency', label: 'Conversational Fluency' }
        ]
      },
      {
        key: 'correctionLevel',
        label: 'Correction Preference',
        type: 'select',
        required: false,
        options: [
          { value: 'gentle', label: 'Gentle corrections' },
          { value: 'moderate', label: 'Moderate feedback' },
          { value: 'intensive', label: 'Intensive corrections' }
        ]
      }
    ],
    voiceOptions: [
      { 
        value: 'ash', 
        label: 'Ashley - Patient Teacher', 
        description: 'Encouraging and supportive' 
      },
      { 
        value: 'coral', 
        label: 'Coral - Native Speaker', 
        description: 'Natural conversational pace' 
      },
      { 
        value: 'sage', 
        label: 'Sage - Language Tutor', 
        description: 'Clear pronunciation, educational' 
      }
    ]
  },

  generateInstructions: (config) => {
    const { language, proficiencyLevel, conversationTopic, scenario, focusArea, correctionLevel } = config;
    
    const languageInstructions = {
      'spanish': 'Speak primarily in Spanish, adjusting complexity based on proficiency level.',
      'french': 'Speak primarily in French, using appropriate formality levels.',
      'german': 'Speak primarily in German, being mindful of case and verb placement.',
      'italian': 'Speak primarily in Italian, using expressive and warm communication.',
      'portuguese': 'Speak primarily in Portuguese, distinguishing between formal and informal speech.',
      'mandarin': 'Speak primarily in Mandarin Chinese, using appropriate tones and characters.'
    };

    const proficiencyGuidelines = {
      'beginner': 'Use simple vocabulary, short sentences, and speak slowly. Repeat important phrases. Be very patient.',
      'intermediate': 'Use moderate complexity, explain idioms, and maintain a natural but clear pace.',
      'advanced': 'Use natural speech patterns, complex grammar, and cultural references. Challenge the learner appropriately.'
    };

    const topicContext = {
      'travel': 'Focus on travel-related vocabulary: transportation, accommodations, directions, cultural sites.',
      'business': 'Use professional language: meetings, presentations, negotiations, workplace communication.',
      'daily': 'Cover everyday situations: family, hobbies, weather, food, daily routines.',
      'academic': 'Include educational topics: studies, research, academic discussions, formal presentations.',
      'cultural': 'Explore cultural topics: traditions, holidays, customs, social norms.',
      'shopping': 'Practice commercial interactions: prices, sizes, returns, customer service.'
    };

    const correctionGuidelines = {
      'gentle': 'Gently correct major errors without interrupting flow. Focus on encouragement.',
      'moderate': 'Provide balanced feedback on grammar and vocabulary. Suggest improvements.',
      'intensive': 'Actively correct errors and provide detailed explanations. Push for accuracy.'
    };

    const scenarioContext = scenario ? `\n\nSPECIFIC SCENARIO: ${scenario}` : '';

    return `You are a native ${language} speaker having a conversation about ${conversationTopic}.

LANGUAGE: ${languageInstructions[language]}

PROFICIENCY ADAPTATION: ${proficiencyGuidelines[proficiencyLevel]}

TOPIC FOCUS: ${topicContext[conversationTopic]}

${focusArea ? `FOCUS AREA: Pay special attention to ${focusArea} during the conversation.` : ''}

CORRECTION STYLE: ${correctionGuidelines[correctionLevel || 'moderate']}${scenarioContext}

CONVERSATION GUIDELINES:
- Start with a natural greeting in ${language}
- Ask open-ended questions to encourage speaking
- Use vocabulary appropriate for the topic and level
- Provide cultural context when relevant
- Be patient and encouraging
- Help with pronunciation when needed
- Keep the conversation flowing naturally

Remember: Your goal is to help the learner practice ${language} in a supportive, engaging way while focusing on ${conversationTopic}.`;
  },

  generateGreeting: (config) => {
    const { language, conversationTopic } = config;
    
    const greetings = {
      'spanish': '¡Hola! ¿Cómo estás? Me alegra poder practicar español contigo.',
      'french': 'Bonjour ! Comment allez-vous ? Je suis ravi de pratiquer le français avec vous.',
      'german': 'Hallo! Wie geht es Ihnen? Ich freue mich, mit Ihnen Deutsch zu sprechen.',
      'italian': 'Ciao! Come sta? Sono felice di praticare italiano con lei.',
      'portuguese': 'Olá! Como está? Fico feliz em praticar português com você.',
      'mandarin': '你好！你好吗？我很高兴能和你练习中文。'
    };
    
    return greetings[language] || 'Hello! Ready to practice?';
  },

  validateConfig: (config) => {
    const errors: string[] = [];
    
    if (!config.language) {
      errors.push('Target language is required');
    }
    
    if (!config.proficiencyLevel) {
      errors.push('Proficiency level is required');
    }
    
    if (!config.conversationTopic) {
      errors.push('Conversation topic is required');
    }
    
    return errors;
  }
};
```

## 🏢 Business: Negotiation Training

A scenario for practicing business negotiations and deal-making.

```typescript
// scenarios/negotiation-training.ts
import { CallScenario } from './types';

export const negotiationTrainingScenario: CallScenario = {
  id: 'negotiation-training',
  name: 'Business Negotiation Training',
  description: 'Practice negotiation skills in various business contexts',
  icon: '🤝',
  
  schema: {
    id: 'negotiation-training',
    name: 'Business Negotiation Training',
    description: 'Practice negotiation skills in various business contexts',
    icon: '🤝',
    fields: [
      {
        key: 'negotiationType',
        label: 'Negotiation Type',
        type: 'select',
        required: true,
        options: [
          { value: 'salary', label: 'Salary Negotiation' },
          { value: 'contract', label: 'Contract Terms' },
          { value: 'vendor', label: 'Vendor/Supplier Deal' },
          { value: 'partnership', label: 'Business Partnership' },
          { value: 'acquisition', label: 'Merger & Acquisition' },
          { value: 'licensing', label: 'Licensing Agreement' }
        ]
      },
      {
        key: 'yourRole',
        label: 'Your Role',
        type: 'select',
        required: true,
        options: [
          { value: 'buyer', label: 'Buyer/Purchaser' },
          { value: 'seller', label: 'Seller/Vendor' },
          { value: 'employee', label: 'Employee' },
          { value: 'employer', label: 'Employer/Manager' },
          { value: 'partner', label: 'Potential Partner' }
        ]
      },
      {
        key: 'counterpartStyle',
        label: 'Counterpart Style',
        type: 'select',
        required: true,
        options: [
          { value: 'collaborative', label: 'Collaborative - Win-win focused' },
          { value: 'competitive', label: 'Competitive - Aggressive tactics' },
          { value: 'analytical', label: 'Analytical - Data-driven' },
          { value: 'relationship', label: 'Relationship-focused' },
          { value: 'time-pressured', label: 'Time-pressured - Urgent' }
        ]
      },
      {
        key: 'dealValue',
        label: 'Deal Value/Stakes',
        type: 'select',
        required: false,
        options: [
          { value: 'low', label: 'Low stakes ($1K - $10K)' },
          { value: 'medium', label: 'Medium stakes ($10K - $100K)' },
          { value: 'high', label: 'High stakes ($100K+)' }
        ]
      },
      {
        key: 'keyIssues',
        label: 'Key Issues to Negotiate',
        type: 'textarea',
        required: true,
        placeholder: 'e.g., Price, delivery timeline, payment terms, exclusivity, support level',
        validation: {
          minLength: 10,
          maxLength: 500
        }
      },
      {
        key: 'yourGoals',
        label: 'Your Negotiation Goals',
        type: 'textarea',
        required: true,
        placeholder: 'What do you want to achieve? What are your must-haves vs. nice-to-haves?',
        validation: {
          minLength: 10,
          maxLength: 500
        }
      },
      {
        key: 'difficulty',
        label: 'Difficulty Level',
        type: 'select',
        required: false,
        options: [
          { value: 'easy', label: 'Easy - Reasonable counterpart' },
          { value: 'medium', label: 'Medium - Some resistance' },
          { value: 'hard', label: 'Hard - Tough negotiator' }
        ]
      }
    ],
    voiceOptions: [
      { 
        value: 'sage', 
        label: 'Sage - Analytical Negotiator', 
        description: 'Data-focused, methodical approach' 
      },
      { 
        value: 'ash', 
        label: 'Ashley - Professional', 
        description: 'Balanced, business-focused' 
      },
      { 
        value: 'coral', 
        label: 'Coral - Relationship Builder', 
        description: 'Warm but firm negotiator' 
      },
      { 
        value: 'ballad', 
        label: 'Blake - Tough Negotiator', 
        description: 'Direct, challenging style' 
      }
    ]
  },

  generateInstructions: (config) => {
    const { negotiationType, yourRole, counterpartStyle, dealValue, keyIssues, yourGoals, difficulty } = config;
    
    const styleDescriptions = {
      'collaborative': 'You believe in win-win solutions and look for creative ways to meet both parties\' needs.',
      'competitive': 'You use pressure tactics, make aggressive opening offers, and push hard for concessions.',
      'analytical': 'You rely heavily on data, want detailed justifications, and make decisions based on metrics.',
      'relationship': 'You prioritize long-term relationships and trust-building over short-term gains.',
      'time-pressured': 'You have urgent deadlines and need to close deals quickly.'
    };

    const difficultyModifiers = {
      'easy': 'You are reasonable and willing to compromise when presented with good arguments.',
      'medium': 'You have some flexibility but will push back on unreasonable requests.',
      'hard': 'You are a tough negotiator who will challenge every point and demand significant concessions.'
    };

    const roleContext = yourRole === 'buyer' ? 'You are the buyer in this negotiation.' :
                       yourRole === 'seller' ? 'You are the seller in this negotiation.' :
                       yourRole === 'employee' ? 'You are representing the employee side.' :
                       yourRole === 'employer' ? 'You are representing the employer side.' :
                       'You are a potential business partner.';

    return `You are negotiating a ${negotiationType} deal. ${roleContext}

NEGOTIATION STYLE: ${styleDescriptions[counterpartStyle]}

DIFFICULTY LEVEL: ${difficultyModifiers[difficulty || 'medium']}

KEY ISSUES TO DISCUSS: ${keyIssues}

YOUR COUNTERPART'S GOALS: You have your own objectives that may conflict with theirs. Their stated goals are: ${yourGoals}

${dealValue ? `DEAL STAKES: This is a ${dealValue} stakes negotiation, so adjust your approach accordingly.` : ''}

NEGOTIATION GUIDELINES:
- Start with your opening position (be strategic about this)
- Listen to their proposals and respond appropriately
- Use your negotiation style consistently
- Make counteroffers when their proposals don't meet your needs
- Look for areas of mutual benefit when possible
- Be prepared to walk away if terms aren't acceptable
- Close the deal when you reach acceptable terms

TACTICS TO USE:
- Ask probing questions to understand their priorities
- Present your position with supporting rationale
- Use appropriate pressure based on your style
- Make strategic concessions to move the negotiation forward
- Test their flexibility on key issues

Remember: You are the COUNTERPART in this negotiation. Respond authentically to their proposals while pursuing your own objectives.`;
  },

  generateGreeting: (config) => {
    const { negotiationType, counterpartStyle } = config;
    
    const greetings = {
      'collaborative': `Hello! I'm looking forward to our discussion about the ${negotiationType}. I'm confident we can find a solution that works for both of us.`,
      'competitive': `Good to speak with you about the ${negotiationType}. I hope you're prepared to discuss some serious terms today.`,
      'analytical': `Hello, thank you for taking the time to discuss the ${negotiationType}. I have some data and analysis I'd like to review with you.`,
      'relationship': `Hi there! It's great to connect with you about the ${negotiationType}. I believe this could be the start of a great partnership.`,
      'time-pressured': `Hello, I appreciate you making time for this call about the ${negotiationType}. I know we're both busy, so let's get right to it.`
    };
    
    return greetings[counterpartStyle] || `Hello! Ready to discuss the ${negotiationType}?`;
  },

  validateConfig: (config) => {
    const errors: string[] = [];
    
    if (!config.negotiationType) {
      errors.push('Negotiation type is required');
    }
    
    if (!config.yourRole) {
      errors.push('Your role in the negotiation is required');
    }
    
    if (!config.counterpartStyle) {
      errors.push('Counterpart negotiation style is required');
    }
    
    if (!config.keyIssues || config.keyIssues.length < 10) {
      errors.push('Key issues must be at least 10 characters');
    }
    
    if (!config.yourGoals || config.yourGoals.length < 10) {
      errors.push('Your negotiation goals must be at least 10 characters');
    }
    
    return errors;
  }
};
```

## 🎭 Entertainment: Acting Coach

A scenario for actors to practice different roles and scenes.

```typescript
// scenarios/acting-coach.ts
import { CallScenario } from './types';

export const actingCoachScenario: CallScenario = {
  id: 'acting-coach',
  name: 'Acting & Performance Coach',
  description: 'Practice acting skills with different characters and scenes',
  icon: '🎭',
  
  schema: {
    id: 'acting-coach',
    name: 'Acting & Performance Coach',
    description: 'Practice acting skills with different characters and scenes',
    icon: '🎭',
    fields: [
      {
        key: 'sceneType',
        label: 'Scene Type',
        type: 'select',
        required: true,
        options: [
          { value: 'dramatic', label: 'Dramatic Scene' },
          { value: 'comedy', label: 'Comedy Scene' },
          { value: 'romantic', label: 'Romantic Scene' },
          { value: 'thriller', label: 'Thriller/Suspense' },
          { value: 'monologue', label: 'Monologue Practice' },
          { value: 'improv', label: 'Improvisation' }
        ]
      },
      {
        key: 'characterType',
        label: 'Character to Practice',
        type: 'select',
        required: true,
        options: [
          { value: 'protagonist', label: 'Protagonist/Hero' },
          { value: 'antagonist', label: 'Antagonist/Villain' },
          { value: 'supporting', label: 'Supporting Character' },
          { value: 'comic-relief', label: 'Comic Relief' },
          { value: 'mentor', label: 'Mentor/Wise Figure' },
          { value: 'love-interest', label: 'Love Interest' }
        ]
      },
      {
        key: 'setting',
        label: 'Scene Setting',
        type: 'text',
        required: true,
        placeholder: 'e.g., Hospital emergency room, Medieval castle, Modern office',
        validation: {
          minLength: 5,
          maxLength: 200
        }
      },
      {
        key: 'relationship',
        label: 'Character Relationship',
        type: 'text',
        required: true,
        placeholder: 'e.g., Estranged siblings, Business rivals, Old friends',
        validation: {
          minLength: 5,
          maxLength: 200
        }
      },
      {
        key: 'emotionalTone',
        label: 'Emotional Tone',
        type: 'select',
        required: true,
        options: [
          { value: 'intense', label: 'Intense/High Stakes' },
          { value: 'lighthearted', label: 'Lighthearted/Playful' },
          { value: 'melancholy', label: 'Melancholy/Sad' },
          { value: 'tense', label: 'Tense/Conflict' },
          { value: 'mysterious', label: 'Mysterious/Intriguing' },
          { value: 'passionate', label: 'Passionate/Romantic' }
        ]
      },
      {
        key: 'objective',
        label: 'Character Objective',
        type: 'textarea',
        required: true,
        placeholder: 'What does your character want in this scene? What are they trying to achieve?',
        validation: {
          minLength: 10,
          maxLength: 300
        }
      },
      {
        key: 'backstory',
        label: 'Relevant Backstory',
        type: 'textarea',
        required: false,
        placeholder: 'Any important background information that affects this scene...',
        validation: {
          maxLength: 500
        }
      },
      {
        key: 'focusArea',
        label: 'Acting Focus',
        type: 'select',
        required: false,
        options: [
          { value: 'emotion', label: 'Emotional Range' },
          { value: 'dialogue', label: 'Dialogue Delivery' },
          { value: 'physicality', label: 'Physical Acting' },
          { value: 'subtext', label: 'Subtext & Layers' },
          { value: 'timing', label: 'Timing & Pacing' }
        ]
      }
    ],
    voiceOptions: [
      { 
        value: 'coral', 
        label: 'Coral - Dramatic Partner', 
        description: 'Expressive, emotionally engaged' 
      },
      { 
        value: 'ballad', 
        label: 'Blake - Character Actor', 
        description: 'Versatile, adaptable to different roles' 
      },
      { 
        value: 'ash', 
        label: 'Ashley - Scene Partner', 
        description: 'Professional, supportive acting partner' 
      },
      { 
        value: 'sage', 
        label: 'Sage - Acting Coach', 
        description: 'Analytical, provides feedback and direction' 
      }
    ]
  },

  generateInstructions: (config) => {
    const { sceneType, characterType, setting, relationship, emotionalTone, objective, backstory, focusArea } = config;
    
    const sceneGuidelines = {
      'dramatic': 'This is a serious, emotionally charged scene. Focus on authentic emotion and meaningful stakes.',
      'comedy': 'This is a comedic scene. Use timing, physical comedy, and wit. React to absurd situations naturally.',
      'romantic': 'This is a romantic scene. Focus on chemistry, intimacy, and emotional vulnerability.',
      'thriller': 'This is a suspenseful scene. Build tension, use pauses effectively, and maintain mystery.',
      'monologue': 'This is monologue practice. Listen actively and provide appropriate reactions and responses.',
      'improv': 'This is improvisation. Say "yes, and..." to their offers and build the scene collaboratively.'
    };

    const characterGuidelines = {
      'protagonist': 'You are the main character\'s scene partner. Support their journey while having your own clear objectives.',
      'antagonist': 'You are in opposition to the main character. Create conflict while remaining believable and motivated.',
      'supporting': 'You are a supporting character. Serve the scene while maintaining your own personality and goals.',
      'comic-relief': 'You provide humor and levity. Use timing and physical comedy while staying true to the scene.',
      'mentor': 'You are a wise, guiding figure. Offer wisdom and support while challenging when appropriate.',
      'love-interest': 'You are the romantic partner. Focus on chemistry, vulnerability, and emotional connection.'
    };

    const toneGuidelines = {
      'intense': 'The stakes are high and emotions run deep. Every moment matters.',
      'lighthearted': 'Keep things fun and playful. Find joy and humor in the situation.',
      'melancholy': 'There\'s a sadness or loss underlying this scene. Play the emotional weight.',
      'tense': 'There\'s conflict and disagreement. Maintain tension while staying in character.',
      'mysterious': 'Something is hidden or unknown. Use subtext and leave things unsaid.',
      'passionate': 'Emotions are strong and feelings run deep. Commit fully to the moment.'
    };

    const backstoryContext = backstory ? `\n\nBACKSTORY: ${backstory}` : '';
    const focusContext = focusArea ? `\n\nACTING FOCUS: Pay special attention to ${focusArea} during this scene.` : '';

    return `You are acting in a ${sceneType} scene set in ${setting}.

CHARACTER TYPE: ${characterGuidelines[characterType]}

RELATIONSHIP: You and the other character are ${relationship}.

SCENE TONE: ${toneGuidelines[emotionalTone]}

SCENE GUIDELINES: ${sceneGuidelines[sceneType]}

YOUR CHARACTER'S OBJECTIVE: ${objective}${backstoryContext}${focusContext}

ACTING GUIDELINES:
- Stay in character throughout the scene
- React authentically to what the other actor gives you
- Pursue your character's objective actively
- Use the emotional tone to guide your choices
- Make strong, specific acting choices
- Listen and respond truthfully in the moment
- Build the scene collaboratively

SCENE STRUCTURE:
- Start with a clear entrance or opening
- Develop the conflict or situation
- Build to a climactic moment
- Find a natural resolution or cliffhanger

Remember: You are a SCENE PARTNER helping them practice their craft. Stay committed to your character while supporting their performance.`;
  },

  generateGreeting: (config) => {
    const { sceneType, setting, relationship } = config;
    
    // Generate contextual scene openings
    const greetings = [
      `*enters the ${setting}* Well, well... look who's here.`,
      `*looking around the ${setting}* I didn't expect to see you here.`,
      `*approaching cautiously* We need to talk about what happened.`,
      `*with urgency* Thank goodness you're here! I've been waiting.`,
      `*surprised* You came. I wasn't sure you would.`
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  },

  validateConfig: (config) => {
    const errors: string[] = [];
    
    if (!config.sceneType) {
      errors.push('Scene type is required');
    }
    
    if (!config.characterType) {
      errors.push('Character type is required');
    }
    
    if (!config.setting || config.setting.length < 5) {
      errors.push('Scene setting must be at least 5 characters');
    }
    
    if (!config.relationship || config.relationship.length < 5) {
      errors.push('Character relationship must be at least 5 characters');
    }
    
    if (!config.emotionalTone) {
      errors.push('Emotional tone is required');
    }
    
    if (!config.objective || config.objective.length < 10) {
      errors.push('Character objective must be at least 10 characters');
    }
    
    return errors;
  }
};
```

## 🔧 Registering Multiple Scenarios

Here's how to register all these example scenarios:

```typescript
// scenarios/index.ts
import { ScenarioRegistry } from './registry';
import { jobInterviewScenario } from './job-interview';
import { customerServiceScenario } from './customer-service';
import { medicalConsultationScenario } from './medical-consultation';
import { languageLearningScenario } from './language-learning';
import { negotiationTrainingScenario } from './negotiation-training';
import { actingCoachScenario } from './acting-coach';

export function initializeScenarios(): ScenarioRegistry {
  const registry = new ScenarioRegistry();
  
  // Core scenarios
  registry.register(jobInterviewScenario);
  registry.register(customerServiceScenario);
  
  // Extended scenarios
  registry.register(medicalConsultationScenario);
  registry.register(languageLearningScenario);
  registry.register(negotiationTrainingScenario);
  registry.register(actingCoachScenario);
  
  console.log(`📋 Initialized ${registry.getAll().length} scenarios`);
  
  return registry;
}
```

## 🎯 Key Takeaways

These examples demonstrate:

1. **Domain Diversity**: Scenarios can cover any field - healthcare, education, business, entertainment
2. **Field Variety**: Different input types create rich configuration options
3. **Dynamic Instructions**: AI behavior adapts based on user choices
4. **Contextual Greetings**: Opening messages match the scenario context
5. **Robust Validation**: Ensure quality user input for better AI responses
6. **Voice Matching**: Different voices suit different scenario types
7. **Scalable Architecture**: Easy to add new scenarios without affecting existing ones

Each scenario follows the same interface but creates completely different experiences, showcasing the power and flexibility of the plugin architecture. 