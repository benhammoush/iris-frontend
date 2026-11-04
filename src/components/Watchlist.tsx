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
import { unitPrice } from '../data/unitPrice';
import Navbar from './Navbar';
import AssetIcon from './AssetIcon';
import WatchlistFeedback from './WatchlistFeedback';
import { useWalletSummaries } from '../hooks/useWalletSummaries';
import WatchlistWalletSummary from './WatchlistWalletSummary';
import './Watchlist.css';

/** Render the watchlist route under its account and feature boundaries.
 * @returns The eligible private watchlist view or an account/feature notice.
 */
export default function Watchlist() {
  const { status, user } = useAccount();
  useEffect(() => {
    document.getElementById('iris-main')?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="iris-shell iris-watchlist-studio">
      <Navbar />
      <main
        id="iris-main"
        tabIndex={-1}
        className="iris-page iris-watchlist-page"
      >
        <div className="iris-page-heading">
          <div>
            <h1>Watchlist</h1>
            <p>Your saved assets and public wallets.</p>
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
/** Render account-scoped saved assets and wallets with mutation feedback.
 * @returns Saved resources and their independent mutation/load feedback.
 */
function ReadyWatchlist() {
  const list = useWatchlist();
  const { assets } = useCatalog();
  const summaries = useWalletSummaries(
    list.data?.wallets.map((item) => item.address) ?? [],
  );
  const headings = useRef<
    Partial<Record<WatchlistKind, HTMLHeadingElement | null>>
  >({});
  /** Remove the identified saved resource from the current account watchlist.
   * @param kind - Saved asset or wallet collection.
   * @param address - Exact resource identity to remove.
   */
  async function remove(kind: WatchlistKind, address: string) {
    if (await list.mutate(kind, address, true))
      headings.current[kind]?.focus({ preventScroll: true });
  }
  return (
    <>
      <div className="iris-watchlist-toolbar">
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
      <div className="iris-watchlist-sections">
        {list.data &&
          (['asset', 'wallet'] as const).map((kind) => {
            const items = list.data?.[sectionFor(kind)] ?? [];
            const title = kind === 'asset' ? 'Assets' : 'Wallets';
            return (
              <section
                key={kind}
                className="iris-watchlist-section"
                aria-labelledby={`watchlist-${kind}`}
              >
                <div className="iris-watchlist-section-heading">
                  <h2
                    id={`watchlist-${kind}`}
                    ref={(element) => {
                      headings.current[kind] = element;
                    }}
                    tabIndex={-1}
                  >
                    {title}
                  </h2>
                  <span>{items.length} / 100 saved</span>
                </div>
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
                            {kind === 'asset' ? 'Asset' : 'Address'}
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
                                  {kind === 'asset' ? (
                                    <span className="iris-watchlist-identity">
                                      <span
                                        className="iris-watchlist-logo"
                                        aria-hidden="true"
                                      >
                                        <AssetIcon
                                          src={asset?.imageUrl}
                                          symbol={asset?.symbol}
                                        />
                                      </span>
                                      <span className="iris-watchlist-asset-name">
                                        {name ? (
                                          <>
                                            {asset?.symbol || name}
                                            {asset?.symbol &&
                                              name !== asset.symbol && (
                                                <small>{name}</small>
                                              )}
                                          </>
                                        ) : (
                                          `${item.address.slice(0, 6)}…${item.address.slice(-4)}`
                                        )}
                                      </span>
                                    </span>
                                  ) : (
                                    `${item.address.slice(0, 6)}…${item.address.slice(-4)}`
                                  )}
                                </Link>
                              </td>
                              {kind === 'asset' ? (
                                <td className="iris-watchlist-number">
                                  {unitPrice(asset?.priceUsd)}
                                </td>
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
              </section>
            );
          })}
      </div>
    </>
  );
}
