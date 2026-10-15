import { lazy, Suspense } from 'react';
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
const ApiDocs = lazy(() => import('./components/ApiDocs'));
function App() {
  const location = useLocation(); // utilisez useLocation pour obtenir l'URL actuelle

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
      <CatalogProvider>
        <HeliusDashboardProvider>
          <div className="scroll-smooth">
            <Routes>
              <Route path="/" element={<Home />} />
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
    </ThemeProvider>
  );
}
export default App;
