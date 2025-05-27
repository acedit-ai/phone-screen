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
  // Organized sidebar with logical groupings
  tutorialSidebar: [
    'intro',
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
      label: '🏗️ Architecture',
      items: [
        'architecture/session-management',
        'architecture/rate-limiting',
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
    'customization',
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
        'development/workflow',
      ],
    },
    'troubleshooting',
  ],
};

export default sidebars;
