import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './components/Home';
import Wallet from './components/Wallet';
import Asset from './components/Asset';
import NoMatch from './components/NoMatch';
import Catalog from './components/Catalog';
import { CatalogProvider } from './contexts/CatalogContext';
import { HeliusDashboardProvider } from './contexts/HeliusDashboardContext';
import { apiConfigurationError } from './api/client';
import { ThemeProvider } from './design-system';
import { AccountProvider } from './contexts/AccountContext';
const ApiDocs = lazy(() => import('./components/ApiDocs'));
const Account = lazy(() => import('./components/Account'));
function App() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    // Dashboard navigation must not leave focus on a removed search control.
    document.getElementById('iris-main')?.focus({ preventScroll: true });
  }, [location.pathname]);

  if (location.pathname === '/api-docs') {
    return (
      <ThemeProvider>
        <Suspense
          fallback={
            <main className="min-h-screen p-6">
              Loading API documentation...
            </main>
          }
        >
          <ApiDocs />
        </Suspense>
      </ThemeProvider>
    );
  }

  if (apiConfigurationError) {
    return (
      <main
        className="flex min-h-screen items-center justify-center p-6 text-center"
        role="alert"
      >
        <div>
          <h1 className="text-xl font-semibold">CONFIGURATION_ERROR</h1>
          <p className="mt-2">{apiConfigurationError}</p>
        </div>
      </main>
    );
  }

  return (
    <ThemeProvider>
      <AccountProvider>
        <CatalogProvider>
          <HeliusDashboardProvider>
            <div className="scroll-smooth">
              <Routes>
                <Route path="/" element={<Home />} />
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
                <Route path="/assets" element={<Catalog kind="assets" />} />
                <Route path="/wallets" element={<Catalog kind="wallets" />} />
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
            </div>
          </HeliusDashboardProvider>
        </CatalogProvider>
      </AccountProvider>
    </ThemeProvider>
  );
}
export default App;
