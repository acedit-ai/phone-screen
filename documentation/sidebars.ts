import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Comprehensive sidebar with logical groupings for the modular platform
  tutorialSidebar: [
    'index',
    'quick-start',
    {
      type: 'category',
      label: '🚀 Getting Started',
      items: [
        'getting-started/environment-setup',
      ],
    },
    {
      type: 'category',
      label: '🔌 Scenario System',
      items: [
        'scenarios/overview',
        'scenarios/creating-scenarios',
        'scenarios/api-reference',
        'scenarios/best-practices',
        'scenarios/examples',
      ],
    },
    {
      type: 'category',
      label: '🏗️ Architecture',
      items: [
        'architecture/overview',
        'architecture/rate-limiting',
        'architecture/session-management',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: '⚙️ Configuration',
      items: [
        'configuration/neondb-setup',
      ],
    },
    {
      type: 'category',
      label: '🚀 Deployment',
      items: [
        'deployment',
        'deployment/vercel-integration',
      ],
    },
    {
      type: 'category',
      label: '🛠️ Development',
      items: [
        'developer-guide',
        'development/workflow',
      ],
    },
    'troubleshooting',
  ],
};

export default sidebars;
