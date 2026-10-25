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
    <div className="App bg-background_light font-poppins dark:bg-background_dark">
      <Navbar />
      <main
        id="iris-main"
        tabIndex={-1}
        className="flex h-[70vh] items-center justify-center"
      >
        Asset or wallet address not found.
      </main>
    </div>
  );
}

export default NoMatch;
