/**
 * Shared navigation, market metrics and responsive search entry points.
 * @packageDocumentation
 */

import { useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCatalog } from '../contexts/CatalogContext';
import { APP_DISPLAY_VERSION } from '../appVersion';
import { useTheme } from '../design-system';
import { useHeliusDashboard } from '../contexts/HeliusDashboardContext';
import ValueSkeleton from './ValueSkeleton';
import NavbarSearch from './NavbarSearch';
import { accountsEnabled } from '../auth/config';

/** Format an available monetary metric without substituting zero for missing data. */
function money(value: unknown, digits = 2) {
  return value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Scale a known display metric to millions without changing its source value. */
function millions(value: unknown) {
  return value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
    ? '—'
    : `$${(Number(value) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
}

/** Normalize or format the numeric value according to this boundary and its unavailable fallback. */
function number(value: unknown, digits = 0) {
  return value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
}

/** Format a lamport-denominated network metric as a display SOL amount. */
function sol(lamports: unknown) {
  return lamports === null ||
    lamports === undefined ||
    !Number.isFinite(Number(lamports))
    ? '—'
    : `${(Number(lamports) / 1_000_000_000).toFixed(6)} SOL`;
}

/** Render shared navigation, market context and asset search. */
function Navbar() {
  const { assets, loading: assetsLoading, error: assetsError } = useCatalog();
  const { network, loading: networkLoading } = useHeliusDashboard();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchTrigger = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();
  const navbarMarket =
    assets.find((asset) => asset.symbol === 'SOL') || assets[0] || null;

  /** Navigate to the selected application path. */
  function go(path: string) {
    navigate(path);
  }

  return (
    <>
      {/* Explicit tabindex includes this link in WebKit's default Tab order. */}
      <a className="iris-skip-link" href="#iris-main" tabIndex={0}>
        Skip to content
      </a>
      <header className="iris-header">
        <Link className="iris-brand" to="/">
          <span className="iris-brand-mark">
            <img src="/logoiris.png" alt="" />
          </span>
          <span className="iris-brand-name">IRIS</span>
          <span className="iris-version">{APP_DISPLAY_VERSION}</span>
        </Link>
        <span className="iris-divider" />
        <nav className="iris-nav" aria-label="Main navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/api-docs">API Docs</NavLink>
          {accountsEnabled && <NavLink to="/account">Account</NavLink>}
          {accountsEnabled && <NavLink to="/watchlist">Watchlist</NavLink>}
        </nav>
        <NavbarSearch
          assets={assets}
          loading={assetsLoading}
          error={assetsError}
          navigate={go}
          mobileOpen={mobileSearchOpen}
          setMobileOpen={setMobileSearchOpen}
          onDismiss={() => mobileSearchTrigger.current?.focus()}
        />
        {assetsLoading && !navbarMarket ? (
          <MarketSkeleton
            className="iris-jupiter-market"
            label="Loading Jupiter market summary"
            labels={['SOL', 'MCAP', '24HVOL']}
          />
        ) : (
          navbarMarket && (
            <div
              className="iris-jupiter-market"
              aria-label={`${navbarMarket.symbol} market summary`}
            >
              <span>
                <b>{navbarMarket.symbol}</b> : {money(navbarMarket.priceUsd)}
              </span>
              <i>/</i>
              <span>
                <b>MCAP</b> : {millions(navbarMarket.marketCapUsd)}
              </span>
              <i>/</i>
              <span>
                <b>24HVOL</b> : {millions(navbarMarket.activity?.volume24hUsd)}
              </span>
            </div>
          )
        )}
        {networkLoading && !network ? (
          <MarketSkeleton
            className="iris-helius-market"
            label="Loading Helius network summary"
            labels={['TPS', 'TRUE TPS', 'AVG FEE']}
          />
        ) : (
          <div
            className="iris-helius-market"
            aria-label="Helius network summary"
          >
            <span>
              <b>TPS</b> : {number(network?.performance?.tps, 2)}
            </span>
            <i>/</i>
            <span>
              <b>TRUE TPS</b> : {number(network?.performance?.nonVoteTps, 2)}
            </span>
            <i>/</i>
            <span>
              <b>AVG FEE</b> : {sol(network?.fees?.averageFeeLamports)}
            </span>
          </div>
        )}
        <div className="iris-header-actions">
          <button
            ref={mobileSearchTrigger}
            className="iris-mobile-search-toggle"
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Open search"
            aria-expanded={mobileSearchOpen}
          >
            SEARCH
          </button>
          <button
            className="iris-theme-button"
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle color theme"
          >
            {mode === 'dark' ? 'LIGHT' : 'DARK'}
          </button>
        </div>
      </header>
      <nav className="iris-mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/api-docs">API Docs</NavLink>
        {accountsEnabled && <NavLink to="/account">Account</NavLink>}
        {accountsEnabled && <NavLink to="/watchlist">Watchlist</NavLink>}
      </nav>
    </>
  );
}

/** Reserve accessible market-metric layout during loading. */
function MarketSkeleton({
  className,
  label,
  labels,
}: {
  className: string;
  label: string;
  labels: string[];
}) {
  return (
    <div className={className} aria-label={label} aria-busy="true">
      <span>
        <b>{labels[0]}</b> : <ValueSkeleton width="28px" />
      </span>
      <i>/</i>
      <span>
        <b>{labels[1]}</b> : <ValueSkeleton width="32px" />
      </span>
      <i>/</i>
      <span>
        <b>{labels[2]}</b> : <ValueSkeleton width="32px" />
      </span>
    </div>
  );
}

export default Navbar;
