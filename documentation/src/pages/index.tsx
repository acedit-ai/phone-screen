import React from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">
          Build and deploy AI-powered phone interviews in minutes. Perfect for technical recruiting, 
          HR screening, and practice interviews.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/quick-start">
            🚀 Quick Start Guide - 10min
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/intro"
            style={{marginLeft: '1rem'}}>
            📖 Learn More
          </Link>
        </div>
        <div style={{marginTop: '1.5rem', fontSize: '0.9rem', opacity: 0.8}}>
          <strong>Open Source</strong> • <strong>Next.js + OpenAI + Twilio</strong> • <strong>Production Ready</strong>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="Complete documentation for setting up AI-powered phone interviews with Next.js, OpenAI Realtime API, and Twilio">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        
        {/* Quick Links Section */}
        <section className={styles.quickLinks}>
          <div className="container">
            <div className="row">
              <div className="col col--12">
                <Heading as="h2" className="text--center margin-bottom--lg">
                  🎯 Popular Guides
                </Heading>
              </div>
            </div>
            <div className="row">
              <div className="col col--4">
                <div className="card">
                  <div className="card__header">
                    <h3>🚀 Quick Start</h3>
                  </div>
                  <div className="card__body">
                    <p>
                      Get your AI phone screen system running in under 10 minutes. 
                      Perfect for developers who want to start immediately.
                    </p>
                  </div>
                  <div className="card__footer">
                    <Link className="button button--primary button--block" to="/quick-start">
                      Start Building
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col col--4">
                <div className="card">
                  <div className="card__header">
                    <h3>🎨 Customization</h3>
                  </div>
                  <div className="card__body">
                    <p>
                      Customize AI behavior, add your branding, integrate with your ATS, 
                      and make it perfect for your use case.
                    </p>
                  </div>
                  <div className="card__footer">
                    <Link className="button button--secondary button--block" to="/customization">
                      Customize
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col col--4">
                <div className="card">
                  <div className="card__header">
                    <h3>🚀 Deploy</h3>
                  </div>
                  <div className="card__body">
                    <p>
                      Production deployment guide with Vercel, Railway, monitoring, 
                      scaling, and security best practices.
                    </p>
                  </div>
                  <div className="card__footer">
                    <Link className="button button--success button--block" to="/deployment">
                      Deploy Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features} style={{background: '#f8f9fa', padding: '4rem 0'}}>
          <div className="container">
            <div className="row">
              <div className="col col--12">
                <Heading as="h2" className="text--center margin-bottom--lg">
                  ✨ What You Get
                </Heading>
              </div>
            </div>
            <div className="row">
              <div className="col col--6">
                <div className="margin-bottom--lg">
                  <h3>🤖 AI-Powered Interviews</h3>
                  <p>OpenAI Realtime API provides natural, real-time conversations that adapt to any job description.</p>
                </div>
                <div className="margin-bottom--lg">
                  <h3>📱 Modern Web Interface</h3>
                  <p>Beautiful React + TypeScript frontend with Tailwind CSS and responsive design.</p>
                </div>
                <div className="margin-bottom--lg">
                  <h3>🔗 Complete Integration</h3>
                  <p>Database storage, call transcripts, webhooks, and API endpoints ready for your ATS.</p>
                </div>
              </div>
              <div className="col col--6">
                <div className="margin-bottom--lg">
                  <h3>☁️ Production Ready</h3>
                  <p>Deploy to Vercel + Railway in minutes. Includes monitoring, scaling, and security.</p>
                </div>
                <div className="margin-bottom--lg">
                  <h3>🛠️ Fully Customizable</h3>
                  <p>Modify AI prompts, add your branding, integrate with existing tools, and scale as needed.</p>
                </div>
                <div className="margin-bottom--lg">
                  <h3>📖 Open Source</h3>
                  <p>MIT licensed, community-driven, with comprehensive documentation and examples.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta} style={{padding: '4rem 0', textAlign: 'center'}}>
          <div className="container">
            <Heading as="h2" className="margin-bottom--md">
              Ready to Build?
            </Heading>
            <p className="margin-bottom--lg" style={{fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2rem'}}>
              Join hundreds of developers who have successfully deployed AI phone interviews. 
              Get started in the next 10 minutes.
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--primary button--lg"
                to="/quick-start">
                🚀 Start Building Now
              </Link>
              <Link
                className="button button--outline button--lg"
                href="https://github.com/acedit-ai/phone-screen"
                style={{marginLeft: '1rem'}}>
                ⭐ View on GitHub
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
