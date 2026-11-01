/**
 * Shared navigation, market metrics and responsive search entry points.
 * @packageDocumentation
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCatalog } from '../contexts/CatalogContext';
import { useTheme } from '../design-system';
import { useHeliusDashboard } from '../contexts/HeliusDashboardContext';
import { ValueSkeleton } from '../design-system';
import NavbarSearch from './NavbarSearch';
import { accountsEnabled } from '../auth/config';
import { useAccount } from '../contexts/AccountContext';

const homeIcon = (
  <svg className="iris-navigation-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
  </svg>
);
const watchlistIcon = (
  <svg className="iris-navigation-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 3h12v18l-6-4-6 4Z" />
  </svg>
);

/** Format an available monetary metric without substituting zero for missing data.
 * @param value - Unknown USD-denominated metric.
 * @param digits - Maximum displayed fractional digits.
 * @returns Formatted USD text or the unavailable placeholder.
 */
function money(value: unknown, digits = 2) {
  return value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Scale a known display metric to millions without changing its source value.
 * @param value - Unknown source metric.
 * @returns A millions-scaled display string or the unavailable placeholder.
 */
function millions(value: unknown) {
  return value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
    ? '—'
    : `$${(Number(value) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
}

/** Normalize or format the numeric value according to this boundary and its unavailable fallback.
 * @param value - Unknown metric to format for navigation context.
 * @param digits - Maximum displayed fractional digits.
 * @returns Localized numeric text or the unavailable placeholder.
 */
function number(value: unknown, digits = 0) {
  return value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
}

/** Format a lamport-denominated network metric as a display SOL amount.
 * @param lamports - Unknown lamport-denominated network metric.
 * @returns Display SOL text or the unavailable placeholder; source quantities stay unchanged.
 */
function sol(lamports: unknown) {
  return lamports === null ||
    lamports === undefined ||
    !Number.isFinite(Number(lamports))
    ? '—'
    : `${(Number(lamports) / 1_000_000_000).toFixed(6)} SOL`;
}

/** Render shared navigation, market context and asset search.
 * @returns Shared application navigation and resource context.
 */
function Navbar() {
  const { assets, loading: assetsLoading, error: assetsError } = useCatalog();
  const { network, loading: networkLoading } = useHeliusDashboard();
  const { status, user, session, signOutFailed, deletion, signingOut } =
    useAccount();
  const signedIn = status === 'ready' && Boolean(user) && !signOutFailed;
  const signedOut = status === 'ready' && !user && !signOutFailed && !deletion;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchTrigger = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();
  const navbarMarket =
    assets.find((asset) => asset.symbol === 'SOL') || assets[0] || null;

  useEffect(() => {
    setMenuOpen(false);
  }, [user?.uid, status]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    /** Close the disclosure without stealing focus from an outside target.
     * @param event - Pointer event checked against the menu and its trigger.
     */
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      )
        setMenuOpen(false);
    }
    /** Escape dismisses navigation and returns focus to its trigger.
     * @param event - Keyboard event that may dismiss navigation.
     */
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuTrigger.current?.focus();
    }
    /** Discard the disclosure when its responsive trigger changes position. */
    function resize() {
      setMenuOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', resize);
    };
  }, [menuOpen]);

  /** Navigate to the selected application path.
   * @param path - Internal application destination selected by navigation.
   */
  function go(path: string) {
    void navigate(path);
  }

  /** Toggle the responsive disclosure and remember the trigger for Escape focus.
   * @param event - Activation of the desktop account or mobile navigation button.
   */
  function toggleMenu(event: MouseEvent<HTMLButtonElement>) {
    menuTrigger.current = event.currentTarget;
    setMobileSearchOpen(false);
    setMenuOpen(!menuOpen);
  }

  /** End the session through its existing guard and expose retry failures on Account. */
  async function signOut() {
    try {
      await session.signOut();
    } catch {
      // Account owns the session's retryable sign-out failure message.
    } finally {
      setMenuOpen(false);
      go('/account');
    }
  }

  const accessLinks =
    status === 'loading' || signingOut ? (
      <span className="iris-auth-pending" role="status">
        {signingOut ? 'Signing out…' : 'Checking account…'}
      </span>
    ) : signedOut ? (
      <>
        <Link
          className="iris-login-link"
          to="/account"
          tabIndex={0}
          onClick={() => setMenuOpen(false)}
        >
          Log in
        </Link>
        <Link
          className="iris-signup-link"
          to="/account?mode=signup"
          tabIndex={0}
          onClick={() => setMenuOpen(false)}
        >
          Sign up
        </Link>
      </>
    ) : (
      <Link
        className="iris-account-link"
        to="/account"
        tabIndex={0}
        onClick={() => setMenuOpen(false)}
      >
        Account
      </Link>
    );

  return (
    <>
      {/* Explicit tabindex includes this link in WebKit's default Tab order. */}
      <a className="iris-skip-link" href="#iris-main" tabIndex={0}>
        Skip to content
      </a>
      <header className="iris-header">
        <div className="iris-header-main">
          <Link className="iris-brand" to="/" aria-label="Iris home">
            <span className="iris-brand-mark">
              <img src="/logoiris.png" alt="" />
            </span>
            <span className="iris-brand-name">IRIS</span>
          </Link>
          <nav className="iris-nav" aria-label="Main navigation">
            <NavLink to="/" end tabIndex={0}>
              {homeIcon}
              Home
            </NavLink>
            {accountsEnabled && (
              <NavLink to="/watchlist" tabIndex={0}>
                {watchlistIcon}
                Watchlist
              </NavLink>
            )}
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
          <div className="iris-header-actions">
            <button
              ref={mobileSearchTrigger}
              className="iris-mobile-search-toggle iris-icon-button"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setMobileSearchOpen(true);
              }}
              aria-label="Open search"
              aria-expanded={mobileSearchOpen}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
            </button>
            <button
              className="iris-theme-button iris-icon-button"
              type="button"
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle color theme"
              title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {mode === 'dark' ? (
                  <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                  </>
                ) : (
                  <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />
                )}
              </svg>
            </button>
            {accountsEnabled && (!signedIn || signingOut) && (
              <div className="iris-auth-links">{accessLinks}</div>
            )}
            <div
              className="iris-menu"
              data-account={signedIn || undefined}
              ref={menuRef}
            >
              {accountsEnabled && signedIn && !signingOut && (
                <button
                  className="iris-account-trigger iris-icon-button"
                  type="button"
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                  aria-controls="iris-mobile-navigation"
                  onClick={toggleMenu}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                  </svg>
                  <span>Account</span>
                </button>
              )}
              <button
                className="iris-menu-toggle iris-icon-button"
                type="button"
                aria-label="Navigation menu"
                aria-expanded={menuOpen}
                aria-controls="iris-mobile-navigation"
                onClick={toggleMenu}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d={
                      menuOpen
                        ? 'm6 6 12 12M6 18 18 6'
                        : 'M4 6h16M4 12h16M4 18h16'
                    }
                  />
                </svg>
              </button>
              <nav
                id="iris-mobile-navigation"
                className="iris-mobile-nav"
                aria-label="Account and navigation"
                hidden={!menuOpen}
              >
                <NavLink
                  to="/"
                  className="iris-menu-primary"
                  end
                  tabIndex={0}
                  onClick={() => setMenuOpen(false)}
                >
                  {homeIcon}
                  Home
                </NavLink>
                {accountsEnabled && (
                  <NavLink
                    to="/watchlist"
                    className="iris-menu-primary"
                    tabIndex={0}
                    onClick={() => setMenuOpen(false)}
                  >
                    {watchlistIcon}
                    Watchlist
                  </NavLink>
                )}
                {accountsEnabled && signedIn && !signingOut ? (
                  <>
                    <NavLink
                      to="/account"
                      tabIndex={0}
                      onClick={() => setMenuOpen(false)}
                    >
                      Account
                    </NavLink>
                    <button type="button" onClick={() => void signOut()}>
                      Sign out
                    </button>
                  </>
                ) : accountsEnabled ? (
                  accessLinks
                ) : null}
              </nav>
            </div>
          </div>
          <div className="iris-header-metrics">
            {assetsLoading && !navbarMarket ? (
              <MarketSkeleton
                className="iris-jupiter-market"
                label="Loading Jupiter market summary"
                labels={['SOL', 'MCAP', '24HVOL']}
              />
            ) : (
              <div
                className="iris-jupiter-market"
                role="region"
                aria-label={`${navbarMarket?.symbol ?? 'SOL'} market summary`}
              >
                <span>
                  <b>{navbarMarket?.symbol ?? 'SOL'}</b>{' '}
                  {money(navbarMarket?.priceUsd)}
                </span>
                <span>
                  <b>MCAP</b> {millions(navbarMarket?.marketCapUsd)}
                </span>
                <span>
                  <b>24HVOL</b> {millions(navbarMarket?.activity?.volume24hUsd)}
                </span>
              </div>
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
                role="region"
                aria-label="Helius network summary"
              >
                <span>
                  <b>TPS</b> {number(network?.performance?.tps, 2)}
                </span>
                <span>
                  <b>TRUE TPS</b> {number(network?.performance?.nonVoteTps, 2)}
                </span>
                <span>
                  <b>AVG FEE</b> {sol(network?.fees?.averageFeeLamports)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

/** Navigation-metric placeholder styling and accessible labels. */
interface MarketSkeletonProps {
  className: string;
  label: string;
  labels: string[];
}

/** Reserve accessible market-metric layout during loading.
 * @param props - Container styling and the group/metric labels to retain.
 * @returns Stable metric placeholders with the supplied loading-region label.
 */
function MarketSkeleton(props: MarketSkeletonProps) {
  const { className, label, labels } = props;
  return (
    <div className={className} aria-label={label} aria-busy="true">
      <span>
        <b>{labels[0]}</b> <ValueSkeleton width="28px" />
      </span>
      <span>
        <b>{labels[1]}</b> <ValueSkeleton width="32px" />
      </span>
      <span>
        <b>{labels[2]}</b> <ValueSkeleton width="32px" />
      </span>
    </div>
  );
}

export default Navbar;
