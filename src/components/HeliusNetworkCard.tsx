import { useEffect, useMemo, useRef } from 'react';
import ValueSkeleton from './ValueSkeleton';
import { isRecord } from '../data/record';

type Network = Record<string, unknown>;
type Transaction = {
  signature?: string | null;
  slot?: number | null;
  blockTime?: string | null;
  action?: string | null;
};

const number = (value: unknown) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toLocaleString('en-US');
const shortSignature = (value: string) =>
  `${value.slice(0, 8)}...${value.slice(-8)}`;
const actionLabel = (value: string | null | undefined) =>
  value
    ? value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Unknown';

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

function Field({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="iris-helius-field">
      <span>{label}</span>
      <strong>{loading ? <ValueSkeleton width="72%" /> : value}</strong>
    </div>
  );
}

export default function HeliusNetworkCard({
  network,
  loading,
  error,
  transactions,
  transactionsLoading,
  transactionsError,
}: {
  network: Network | null;
  loading: boolean;
  error: unknown;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: unknown;
}) {
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
