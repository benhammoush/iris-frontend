/**
 * Account-scoped saved assets and wallets with removal and resource feedback.
 * @packageDocumentation
 */

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { accountsEnabled } from '../auth/config';
import { useAccount } from '../contexts/AccountContext';
import { useCatalog } from '../contexts/CatalogContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import { sectionFor, type WatchlistKind } from '../watchlist/contract';
import { itemKey } from '../watchlist/store';
import Navbar from './Navbar';
import WatchlistFeedback from './WatchlistFeedback';
import CatalogPanel from './CatalogPanel';
import { JupiterLogo } from './Home';
import { useWalletSummaries } from '../hooks/useWalletSummaries';
import WatchlistWalletSummary from './WatchlistWalletSummary';
import './Watchlist.css';

/** Render the watchlist route under its account and feature boundaries. */
export default function Watchlist() {
  const { status, user } = useAccount();
  useEffect(() => {
    document.getElementById('iris-main')?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="iris-shell">
      <Navbar />
      <main
        id="iris-main"
        tabIndex={-1}
        className="iris-page iris-watchlist-page"
      >
        <div className="iris-page-heading">
          <div>
            <p className="iris-eyebrow">Private references</p>
            <h1>Watchlist</h1>
            <p>
              Assets and public wallets you explicitly save. Visible only to
              your account.
            </p>
          </div>
        </div>
        {!accountsEnabled || status === 'disabled' ? (
          <p>
            Watchlists are not enabled in this environment.{' '}
            <Link to="/">Browse public markets</Link>.
          </p>
        ) : status === 'loading' ? (
          <p role="status">Loading account…</p>
        ) : status !== 'ready' ? (
          <p role="alert">
            Accounts are unavailable. Public browsing is unaffected.
          </p>
        ) : !user ? (
          <p>
            <Link to="/account">Sign in</Link> to view your private watchlist.
            Signing in never saves an item automatically.
          </p>
        ) : !user.verified ? (
          <p>
            <Link to="/account">Verify your email</Link> before using private
            watchlists.
          </p>
        ) : (
          <ReadyWatchlist key={user.uid} />
        )}
      </main>
    </div>
  );
}
/** Render account-scoped saved assets and wallets with mutation feedback. */
function ReadyWatchlist() {
  const list = useWatchlist();
  const { assets } = useCatalog();
  const summaries = useWalletSummaries(
    list.data?.wallets.map((item) => item.address) ?? [],
  );
  const headings = useRef<
    Partial<Record<WatchlistKind, HTMLHeadingElement | null>>
  >({});
  /** Remove the identified saved resource from the current account watchlist. */
  async function remove(kind: WatchlistKind, address: string) {
    if (await list.mutate(kind, address, true))
      headings.current[kind]?.focus({ preventScroll: true });
  }
  return (
    <>
      <div className="iris-watchlist-toolbar">
        <p>Newest saves first · Up to 100 per section</p>
        <button
          type="button"
          disabled={list.loading || summaries.loading || Boolean(list.pending)}
          onClick={() => {
            void list.refresh();
            summaries.refresh();
          }}
        >
          {list.loading ? 'Refreshing…' : 'Refresh watchlist'}
        </button>
      </div>
      <WatchlistFeedback {...list} />
      {list.loading && !list.data && <p role="status">Loading watchlist…</p>}
      {list.data &&
        (['asset', 'wallet'] as const).map((kind) => {
          const items = list.data?.[sectionFor(kind)] ?? [];
          const title = kind === 'asset' ? 'Assets' : 'Wallets';
          return (
            <section
              key={kind}
              className={
                kind === 'asset'
                  ? 'iris-section iris-jupiter-dex iris-watchlist-provider'
                  : 'iris-helius-card iris-watchlist-provider'
              }
              aria-label={
                kind === 'asset'
                  ? 'Jupiter asset summaries'
                  : 'Helius wallet summaries'
              }
            >
              {kind === 'asset' ? (
                <div className="iris-jupiter-dex-label">
                  <JupiterLogo />
                  <div>
                    <p>Jupiter</p>
                  </div>
                  <span className="iris-jupiter-badge">Market data</span>
                </div>
              ) : (
                <div className="iris-helius-topline">
                  <img
                    className="iris-helius-logo"
                    src="/helius-dark.svg"
                    alt="Helius"
                  />
                  <span>Wallet summaries</span>
                </div>
              )}
              <CatalogPanel
                title={title}
                tone={kind === 'asset' ? 'volume' : 'trending'}
                count={`${items.length} / 100`}
                headingRef={(element) => {
                  headings.current[kind] = element;
                }}
                id={`watchlist-${kind}`}
              >
                {!items.length ? (
                  <p>
                    No saved {title.toLowerCase()} yet. Open an{' '}
                    {kind === 'asset' ? 'asset' : 'existing public wallet'} and
                    click Save to watchlist.
                  </p>
                ) : (
                  <div className="iris-watchlist-table-scroll">
                    <table className="iris-watchlist-table">
                      <caption className="iris-sr-only">
                        Saved {title.toLowerCase()}, newest first
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">
                            {kind === 'asset' ? 'Name' : 'Address'}
                          </th>
                          <th scope="col">
                            {kind === 'asset' ? '24h volume' : 'Holdings'}
                          </th>
                          <th scope="col">
                            {kind === 'asset' ? 'Price' : 'Priced subtotal'}
                          </th>
                          <th scope="col">
                            <span className="iris-sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const asset =
                            kind === 'asset'
                              ? assets.find(
                                  (asset) => asset.mint === item.address,
                                )
                              : undefined;
                          const name = asset?.name || asset?.symbol;
                          return (
                            <tr key={item.address}>
                              <td>
                                <Link
                                  className={
                                    kind === 'wallet' || !name
                                      ? 'iris-watchlist-address'
                                      : undefined
                                  }
                                  to={`/${kind}/${item.address}`}
                                  title={item.address}
                                  aria-label={
                                    kind === 'asset' && name
                                      ? `${name}${asset?.symbol && asset.symbol !== name ? ` · ${asset.symbol}` : ''} ${item.address}`
                                      : item.address
                                  }
                                >
                                  {kind === 'asset' && name
                                    ? name
                                    : `${item.address.slice(0, 6)}…${item.address.slice(-4)}`}
                                </Link>
                              </td>
                              {kind === 'asset' ? (
                                <>
                                  <td
                                    className="iris-watchlist-number"
                                    title={currency(
                                      asset?.activity?.volume24hUsd,
                                    )}
                                  >
                                    {currency(
                                      asset?.activity?.volume24hUsd,
                                      true,
                                    )}
                                  </td>
                                  <td className="iris-watchlist-number">
                                    {asset?.priceUsd == null ||
                                    !Number.isFinite(asset.priceUsd)
                                      ? '—'
                                      : `$${asset.priceUsd.toLocaleString('en-US', { maximumSignificantDigits: 8 })}`}
                                  </td>
                                </>
                              ) : (
                                <WatchlistWalletSummary
                                  result={summaries.results[item.address]}
                                  busy={summaries.loading}
                                  onRetry={() =>
                                    summaries.refresh(item.address)
                                  }
                                />
                              )}
                              <td className="iris-watchlist-action">
                                <button
                                  type="button"
                                  disabled={
                                    Boolean(list.pending) || list.loading
                                  }
                                  aria-label={`Remove ${item.address} from ${title.toLowerCase()}`}
                                  onClick={() =>
                                    void remove(kind, item.address)
                                  }
                                >
                                  <span className="iris-watchlist-action-label">
                                    {list.pending ===
                                    itemKey(kind, item.address)
                                      ? 'Removing…'
                                      : 'Remove'}
                                  </span>
                                  <span
                                    className="iris-watchlist-action-icon"
                                    aria-hidden="true"
                                  >
                                    {list.pending ===
                                    itemKey(kind, item.address)
                                      ? '…'
                                      : '×'}
                                  </span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CatalogPanel>
            </section>
          );
        })}
    </>
  );
}

/** Format a known monetary value for display and preserve the unavailable-data fallback. */
const currency = (value: number | null | undefined, compact = false) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2, ...(compact ? { notation: 'compact' } : {}) })}`;
