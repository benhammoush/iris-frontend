/**
 * Saved-wallet summary with explicit unavailable valuation and retry feedback.
 * @packageDocumentation
 */

import type { WalletSummaryResult } from '../watchlist/walletSummaries';

/** Format an available monetary metric without substituting zero for missing data.
 * @param value - Available USD valuation, or an unavailable value.
 * @returns Formatted currency text or the unavailable placeholder.
 */
const money = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** One saved wallet's summary state and explicit retry action. */
interface WatchlistWalletSummaryProps {
  result?: WalletSummaryResult;
  busy: boolean;
  /** Ask the resource owner to retry its failed load. */
  onRetry: () => void;
}

/** Render a saved wallet summary without claiming unavailable valuation is zero.
 * @param props - Summary result, in-flight state and user-triggered retry action.
 * @returns Summary cells or accessible loading/failure cells, retaining partial/stale labels.
 */
export default function WatchlistWalletSummary(
  props: WatchlistWalletSummaryProps,
) {
  const { result, busy, onRetry } = props;
  if (!result)
    return (
      <td colSpan={2} className="iris-watchlist-row-state">
        <span role="status">Loading…</span>
      </td>
    );
  if (result.error && !result.data)
    return (
      <td colSpan={2} className="iris-watchlist-row-state">
        <span role="alert">{result.error}</span>{' '}
        <button type="button" disabled={busy} onClick={onRetry}>
          Retry wallet summary
        </button>
      </td>
    );
  const summary = result.data;
  if (!summary) return null;
  const { wallet } = summary;
  return (
    <>
      <td
        className="iris-watchlist-number"
        title={
          wallet.truncated
            ? 'Returned holdings; the Worker truncated this list.'
            : 'Returned holdings'
        }
      >
        {wallet.assets.length}
        {wallet.truncated ? '+' : ''}
        <span className="iris-sr-only">
          {' '}
          returned holdings{wallet.truncated ? '; list truncated' : ''}
        </span>
      </td>
      <td className="iris-watchlist-number">
        <span>{money(wallet.totalValue)}</span>
        {(!wallet.valuation.complete || wallet.truncated) && (
          <small
            className="iris-watchlist-row-hint"
            title="Partial valuation; unpriced holdings are excluded. The holdings list may be truncated."
          >
            Partial
          </small>
        )}
        {summary.stale && (
          <small className="iris-watchlist-row-hint">Stale</small>
        )}
        {result.error && (
          <>
            <span className="iris-sr-only" role="alert">
              {result.error} Showing the last successful summary.
            </span>
            <button
              type="button"
              aria-label="Retry wallet summary"
              disabled={busy}
              onClick={onRetry}
            >
              Retry
            </button>
          </>
        )}
        <span className="iris-sr-only">
          Balances: Helius. Pricing: Jupiter when available.{' '}
          {summary.asOf ? (
            <>
              As of{' '}
              <time dateTime={summary.asOf}>
                {new Date(summary.asOf).toLocaleString()}
              </time>
              .
            </>
          ) : (
            'Snapshot time unavailable.'
          )}
        </span>
      </td>
    </>
  );
}
