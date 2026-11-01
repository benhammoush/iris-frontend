/**
 * Secondary documentation navigation and app version shared by application pages.
 * @packageDocumentation
 */

import { Link } from 'react-router-dom';
import { APP_DISPLAY_VERSION } from '../appVersion';

/** Keep documentation and release metadata outside primary explorer navigation.
 * @returns The shared application footer.
 */
export default function Footer() {
  return (
    <footer className="iris-footer">
      <span>Iris · Solana explorer</span>
      <div className="iris-footer-meta">
        <span className="iris-version">{APP_DISPLAY_VERSION}</span>
        <Link to="/api-docs" tabIndex={0}>
          API Docs
        </Link>
      </div>
    </footer>
  );
}
