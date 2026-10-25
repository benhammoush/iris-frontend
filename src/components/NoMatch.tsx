/**
 * Recovery navigation for unmatched client-side routes.
 * @packageDocumentation
 */

import Navbar from './Navbar';

/** Render recovery navigation for an unmatched client-side route.
 * @returns The route-not-found view with recovery navigation.
 */
function NoMatch() {
  return (
    <div className="iris-not-found">
      <Navbar />
      <main id="iris-main" tabIndex={-1} className="iris-not-found-content">
        Asset or wallet address not found.
      </main>
    </div>
  );
}

export default NoMatch;
