import React from 'react';
import {useThemeConfig} from '@docusaurus/theme-common';
import Link from '@docusaurus/Link';

export default function Footer(): React.JSX.Element | null {
  const {footer} = useThemeConfig();
  
  if (!footer) {
    return null;
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="row">
          {/* Quick Links */}
          <div className="col col--3">
            <h4>📚 Documentation</h4>
            <ul className="footer__links">
              <li><Link to="/intro">Introduction</Link></li>
              <li><Link to="/quick-start">Quick Start</Link></li>
              <li><Link to="/customization">Customization</Link></li>
              <li><Link to="/deployment">Deployment</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="col col--3">
            <h4>🔗 Resources</h4>
            <ul className="footer__links">
              <li><Link href="https://github.com/acedit-ai/phone-screen">GitHub Repository</Link></li>
              <li><Link href="https://phone-screen.acedit.ai">Live Demo</Link></li>
              <li><Link href="https://github.com/acedit-ai/phone-screen/issues">Report Issues</Link></li>
              <li><Link href="https://github.com/acedit-ai/phone-screen/discussions">Discussions</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div className="col col--3">
            <h4>👥 Community</h4>
            <ul className="footer__links">
              <li><Link href="https://twitter.com/acedit_ai">Twitter</Link></li>
              <li><Link href="https://discord.gg/acedit">Discord</Link></li>
              <li><Link href="https://www.linkedin.com/company/acedit">LinkedIn</Link></li>
              <li><Link href="mailto:support@acedit.ai">Support</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col col--3">
            <h4>⚖️ Legal</h4>
            <ul className="footer__links">
              <li><Link href="https://github.com/acedit-ai/phone-screen/blob/main/LICENSE">MIT License</Link></li>
              <li><Link href="https://acedit.ai/privacy">Privacy Policy</Link></li>
              <li><Link href="https://acedit.ai/terms">Terms of Service</Link></li>
              <li><Link href="https://acedit.ai/security">Security</Link></li>
            </ul>
          </div>
        </div>

        <hr style={{margin: '2rem 0', borderColor: 'var(--ifm-color-emphasis-200)'}} />

        <div className="row">
          <div className="col col--6">
            <div className="footer__bottom">
              <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-600)'}}>
                © {new Date().getFullYear()} <Link href="https://acedit.ai">Acedit</Link>. 
                Built with ❤️ using <Link href="https://docusaurus.io">Docusaurus</Link>.
              </p>
            </div>
          </div>
          <div className="col col--6">
            <div className="footer__bottom" style={{textAlign: 'right'}}>
              <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-600)'}}>
                🚀 <strong>Open Source</strong> • 
                🤖 <strong>AI-Powered</strong> • 
                ⚡ <strong>Production Ready</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 