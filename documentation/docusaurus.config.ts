import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'AI Phone Screen Documentation',
  tagline: 'Open-source AI calling system starter',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://phone-screen.acedit.ai',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/documentation/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'acedit-ai', // Usually your GitHub org/user name.
  projectName: 'phone-screen', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Serve docs at /documentation/ (not /documentation/docs/)
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/acedit-ai/phone-screen/tree/main/documentation/',
        },
        blog: false, // Disable blog as requested
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'AI Phone Screen Docs',
      logo: {
        alt: 'AI Phone Screen Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://phone-screen.acedit.ai',
          label: 'Try Demo',
          position: 'right',
        },
        {
          href: 'https://github.com/acedit-ai/phone-screen',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/acedit-ai/phone-screen/issues',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/acedit-ai/phone-screen/discussions',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Main Application',
              href: 'https://phone-screen.acedit.ai',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/acedit-ai/phone-screen',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AI Phone Screen. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
