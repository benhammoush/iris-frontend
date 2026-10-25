/**
 * Network metrics and recent transactions with independent resource feedback.
 * @packageDocumentation
 */

import { useEffect, useMemo, useRef } from 'react';
import ValueSkeleton from './ValueSkeleton';
import { isRecord } from '../data/record';
import ResourceFeedback from './ResourceFeedback';

/** Network metrics and freshness fields rendered by the dashboard card. */
type Network = Record<string, unknown>;
/** Transaction fields rendered by the network dashboard sample. */
type Transaction = {
  signature?: string | null;
  slot?: number | null;
  blockTime?: string | null;
  action?: string | null;
};

/** Normalize or format the numeric value according to this boundary and its unavailable fallback.
 * @param value - Unknown network metric.
 * @returns Localized display text or the unavailable placeholder.
 */
const number = (value: unknown) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toLocaleString('en-US');
/** Shorten the displayed transaction signature while retaining its full link identity.
 * @param value - Full transaction signature used by the link.
 * @returns Its shortened display label.
 */
const shortSignature = (value: string) =>
  `${value.slice(0, 8)}...${value.slice(-8)}`;
/** Map supported transaction actions to readable labels.
 * @param value - Optional normalized transaction action.
 * @returns A readable action label with the existing unknown-action fallback.
 */
const actionLabel = (value: string | null | undefined) =>
  value
    ? value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Unknown';

/** Format the observation age for the dashboard display.
 * @param value - Optional observation timestamp text.
 * @returns A relative age label or the unavailable placeholder.
 */
function relativeTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 1000),
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/** Label, display text and loading state for one network metric. */
interface FieldProps {
  label: string;
  value: string;
  loading?: boolean;
}

/** Render one network metric with a loading placeholder when needed.
 * @param props - Metric label, preformatted value and optional loading state.
 * @returns A labeled value or its loading placeholder.
 */
function Field(props: FieldProps) {
  const { label, value, loading } = props;
  return (
    <div className="iris-helius-field">
      <span>{label}</span>
      <strong>{loading ? <ValueSkeleton width="72%" /> : value}</strong>
    </div>
  );
}

/** Independent network and transaction resources with controlled retry state. */
interface HeliusNetworkCardProps {
  network: Network | null;
  loading: boolean;
  error: unknown;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: unknown;
  refreshing?: boolean;
  /** Ask the resource owner to retry its failed load. */
  onRetry?: () => void;
}

/** Render network and transaction resources with independent loading and failure feedback.
 * @param props - Separate metric/sample snapshots, resource feedback and retry control.
 * @returns Network metrics and a bounded transaction sample, never a complete history claim.
 */
export default function HeliusNetworkCard(props: HeliusNetworkCardProps) {
  const {
    network,
    loading,
    error,
    transactions,
    transactionsLoading,
    transactionsError,
    refreshing = false,
    onRetry,
  } = props;
  const previousSignatures = useRef<Set<string> | null>(null);
  const signatures = useMemo(
    () =>
      new Set(
        transactions.flatMap((transaction) =>
          typeof transaction.signature === 'string'
            ? [transaction.signature]
            : [],
        ),
      ),
    [transactions],
  );
  const newSignatures =
    previousSignatures.current === null
      ? new Set<string>()
      : new Set(
          [...signatures].filter(
            (signature) => !previousSignatures.current?.has(signature),
          ),
        );
  useEffect(() => {
    previousSignatures.current = signatures;
  }, [signatures]);
  const value = network || {};
  const chain = isRecord(value.chain) ? value.chain : { state: 'unavailable' };
  return (
    <section
      className="iris-helius-card"
      aria-label="Helius Solana network and recent transactions"
    >
      <div className="iris-helius-topline">
        <img className="iris-helius-logo" src="/helius-dark.svg" alt="Helius" />
        <span>Network</span>
      </div>
      <ResourceFeedback
        label="Network data"
        error={error || transactionsError}
        busy={loading || transactionsLoading || refreshing}
        hasData={Boolean(network) || transactions.length > 0}
        onRetry={onRetry}
        retryLabel="Retry network data"
      />
      <div className="iris-helius-grid">
        <section
          className="iris-helius-column"
          aria-label="Solana network status"
        >
          <div className="iris-helius-column-heading">
            <h3>Solana network</h3>
          </div>
          {Boolean(error) && !network ? (
            <p className="iris-helius-loading">Network snapshot unavailable.</p>
          ) : (
            <div
              className="iris-helius-summary"
              aria-busy={(loading && !network) || undefined}
            >
              <Field
                label="Processed slot"
                value={number(chain.processedSlot)}
                loading={loading && !network}
              />
              <Field
                label="Confirmed slot"
                value={number(chain.confirmedSlot)}
                loading={loading && !network}
              />
              <Field
                label="Block height"
                value={number(chain.blockHeight)}
                loading={loading && !network}
              />
              <Field
                label="Epoch"
                value={number(chain.epoch)}
                loading={loading && !network}
              />
            </div>
          )}
        </section>
        <section
          className="iris-helius-column iris-helius-transactions"
          aria-label="Recent Solana transactions"
        >
          <div className="iris-helius-column-heading">
            <h3>Recent Solana transactions</h3>
          </div>
          {Boolean(transactionsError) && !transactions.length ? (
            <p className="iris-helius-loading">
              Recent transactions are unavailable.
            </p>
          ) : !transactionsLoading && !transactions.length ? (
            <p className="iris-helius-loading">
              No recent transaction sample is available.
            </p>
          ) : (
            <div
              className="iris-recent-transaction-list"
              role="table"
              aria-label="Latest sampled Solana transactions"
              aria-busy={
                (transactionsLoading && !transactions.length) || undefined
              }
            >
              <div className="iris-recent-transaction-head" role="row">
                <span role="columnheader">Signature</span>
                <span role="columnheader">Time</span>
                <span role="columnheader">Block</span>
                <span role="columnheader">Action</span>
              </div>
              {transactionsLoading && !transactions.length
                ? Array.from({ length: 4 }, (_, index) => (
                    <div className="iris-recent-transaction-row" key={index}>
                      <ValueSkeleton />
                      <ValueSkeleton />
                      <ValueSkeleton />
                      <ValueSkeleton />
                    </div>
                  ))
                : transactions.map((transaction) => {
                    const signature = transaction.signature || '';
                    return (
                      <div
                        className={
                          newSignatures.has(signature)
                            ? 'iris-recent-transaction-row is-new'
                            : 'iris-recent-transaction-row'
                        }
                        key={signature}
                        role="row"
                      >
                        <a
                          href={`https://explorer.solana.com/tx/${encodeURIComponent(signature)}`}
                          target="_blank"
                          rel="noreferrer"
                          role="cell"
                        >
                          {shortSignature(signature)}
                        </a>
                        <time
                          dateTime={transaction.blockTime || undefined}
                          title={
                            transaction.blockTime
                              ? new Date(transaction.blockTime).toLocaleString()
                              : undefined
                          }
                          role="cell"
                        >
                          {relativeTime(transaction.blockTime)}
                        </time>
                        <span role="cell">{number(transaction.slot)}</span>
                        <strong role="cell">
                          {actionLabel(transaction.action)}
                        </strong>
                      </div>
                    );
                  })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
