/**
 * Application route selection and page-level state boundaries.
 * @packageDocumentation
 */

import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './components/Home';
import Wallet from './components/Wallet';
import Asset from './components/Asset';
import NoMatch from './components/NoMatch';
import Footer from './components/Footer';
import { CatalogProvider } from './contexts/CatalogContext';
import { HeliusDashboardProvider } from './contexts/HeliusDashboardContext';
import { apiConfigurationError } from './api/client';
import { ThemeProvider } from './design-system';
import { AccountProvider } from './contexts/AccountContext';
import { WatchlistProvider } from './contexts/WatchlistContext';
const ApiDocs = lazy(() => import('./components/ApiDocs'));
const Account = lazy(() => import('./components/Account'));
const Watchlist = lazy(() => import('./components/Watchlist'));
/** Select and render the application route within its shared providers.
 * @returns The routed application and shared provider boundaries.
 */
function App() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    // Footer entry and the return link must not inherit the previous page's scroll.
    if (
      location.pathname === '/api-docs' ||
      previousPath.current === '/api-docs'
    ) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    previousPath.current = location.pathname;
    // Respect a page's deliberate form focus while clearing removed search controls.
    const main = document.getElementById('iris-main');
    if (!main?.contains(document.activeElement))
      main?.focus({ preventScroll: true });
  }, [location.pathname]);

  if (location.pathname === '/api-docs') {
    return (
      <ThemeProvider>
        <Suspense
          fallback={
            <main className="iris-docs-loading">
              Loading API documentation...
            </main>
          }
        >
          <ApiDocs />
        </Suspense>
        <Footer />
      </ThemeProvider>
    );
  }

  if (apiConfigurationError) {
    return (
      <main className="iris-configuration-error" role="alert">
        <div>
          <h1>CONFIGURATION_ERROR</h1>
          <p>{apiConfigurationError}</p>
        </div>
      </main>
    );
  }

  return (
    <ThemeProvider>
      <AccountProvider>
        <WatchlistProvider>
          <CatalogProvider>
            <HeliusDashboardProvider>
              <div className="iris-routes">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route
                    path="/watchlist"
                    element={
                      <Suspense
                        fallback={
                          <main
                            id="iris-main"
                            tabIndex={-1}
                            className="iris-page"
                          >
                            Loading watchlist…
                          </main>
                        }
                      >
                        <Watchlist />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <Suspense
                        fallback={
                          <main
                            id="iris-main"
                            tabIndex={-1}
                            className="iris-page"
                          >
                            Loading account...
                          </main>
                        }
                      >
                        <Account />
                      </Suspense>
                    }
                  />
                  <Route
                    key={location.pathname}
                    path="/wallet/:address"
                    element={<Wallet />}
                  />
                  <Route
                    key={location.pathname}
                    path="/asset/:mint"
                    element={<Asset />}
                  />
                  <Route path="*" element={<NoMatch />}>
                    {' '}
                  </Route>
                </Routes>
                <Footer />
              </div>
            </HeliusDashboardProvider>
          </CatalogProvider>
        </WatchlistProvider>
      </AccountProvider>
    </ThemeProvider>
  );
}
export default App;
