/**
 * Wallet holdings, nullable valuation and cursor-paginated activity.
 * @packageDocumentation
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SaveControl from './SaveControl';
import { workerApi } from '../api/worker';
import { nextCursorFrom } from '../data/pagination';
import { isRecord } from '../data/record';
import { transactionsFrom, walletFrom } from '../data/normalizers';
import { useWorkerResource } from '../hooks/useWorkerResource';
import DataStatus from './DataStatus';
import Navbar from './Navbar';
import AssetIcon from './AssetIcon';
import { VirtualTable, type VirtualTableColumn } from '../design-system';
import { solanaExplorerUrl } from '../data/solana';
import { ValueSkeleton } from '../design-system';
import ResourceFeedback from './ResourceFeedback';

/** Wallet holding identity, exact quantity and nullable valuation fields. */
type Holding = {
  symbol?: string | null;
  name?: string | null;
  mint?: string;
  imageUrl?: string | null;
  price?: number | null;
  value?: number | null;
  displayBalance?: string;
  amount?: string;
  atomicAmount?: string;
  balance?: number | string;
  rawBalance?: number | string;
};
/** Normalized wallet transfer including direction and asset quantity. */
type Transfer = {
  symbol?: string;
  mint?: string;
  amount?: string | number;
  atomicAmount?: string;
  decimals?: number;
  kind?: 'native' | 'token';
  from?: string | null;
  to?: string | null;
};
/** Wallet activity record used to derive transaction table rows. */
type Activity = {
  id?: string;
  timestamp?: string;
  type?: string;
  source?: string;
  status?: string;
  description?: string;
  transfers?: Transfer[];
};
/** Stable transaction table identity and its normalized activity fields. */
type TransactionRow = {
  id: string;
  timestamp?: string;
  action?: string;
  sender?: string | null;
  recipient?: string | null;
  amount?: string | null;
  decimals?: number;
  transferIndex: number;
};
/** Format a known monetary value for display and preserve the unavailable-data fallback.
 * @param value - Available USD metric, or an unavailable value.
 * @returns Formatted currency text or the unavailable placeholder.
 */
const currency = (value: number | undefined | null) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
/** Format a wallet holding while preserving its exact source quantity.
 * @param asset - Normalized wallet holding with its supported balance representations.
 * @returns The preferred display balance without converting exact source quantities.
 */
const balance = (asset: Holding) => {
  const value =
    asset.displayBalance ?? asset.amount ?? asset.balance ?? asset.rawBalance;
  return value == null ? '—' : String(value);
};
/** Format an available observation timestamp for the user.
 * @param value - Optional observation timestamp text.
 * @returns Local date/time text or the unavailable placeholder.
 */
const dateTime = (value: string | undefined) => {
  const date = value && new Date(value);
  return date && !Number.isNaN(date.valueOf())
    ? date.toLocaleString('en-US')
    : value || '-';
};
/** Shorten a display identifier without changing the full value used by requests or links.
 * @param value - Optional full address or transaction identifier.
 * @returns Its shortened display label or the unavailable placeholder.
 */
const short = (value: string | null | undefined) =>
  value ? `${value.slice(0, 5)}...${value.slice(-5)}` : '—';
/** Derive stable row identity from transaction activity evidence.
 * @param activity - Normalized wallet activity.
 * @returns Its transaction identity or stable field-based fallback key.
 */
const activityKey = (activity: Activity) =>
  activity.id ||
  `${activity.timestamp || ''}:${activity.type || ''}:${activity.description || ''}`;
/** Normalize activity into table rows without duplicating transaction identities.
 * @param activities - Normalized activity records with optional transfer collections.
 * @returns Display rows retaining transaction identity across expanded transfers.
 */
const transactionRowsFrom = (activities: Activity[]): TransactionRow[] =>
  activities.flatMap((activity) => {
    const transfers = activity.transfers?.length ? activity.transfers : [null];
    return transfers.map((transfer, transferIndex) => ({
      id: activity.id || activityKey(activity),
      timestamp: activity.timestamp,
      action: activity.type,
      sender: transfer?.from,
      recipient: transfer?.to,
      amount:
        transfer?.atomicAmount ??
        (transfer?.amount == null ? null : String(transfer.amount)),
      decimals: transfer?.decimals,
      transferIndex,
    }));
  });
const holdingsColumns: VirtualTableColumn<Holding>[] = [
  {
    id: 'asset',
    label: 'Asset',
    width: 240,
    /** Extract asset labels for sorting and filtering.
     * @param asset - Normalized holding backing this row.
     * @returns Its symbol and name without changing mint identity.
     */
    value: (asset) => `${asset.symbol || ''} ${asset.name || ''}`,
    /** Render the holding identity with a stable image fallback.
     * @param asset - Normalized holding backing this row.
     * @returns Asset artwork, symbol and available name or mint text.
     */
    cell: (asset) => (
      <span className="iris-asset-cell">
        <AssetIcon src={asset.imageUrl} symbol={asset.symbol} />
        <strong>{asset.symbol || 'Unknown asset'}</strong>
        <small>
          {asset.name && asset.name !== asset.symbol
            ? asset.name
            : asset.mint || 'Mint unavailable'}
        </small>
      </span>
    ),
  },
  {
    id: 'price',
    label: 'Price',
    width: 130,
    align: 'right',
    /** Extract the existing price sort key.
     * @param asset - Normalized holding backing this row.
     * @returns Its available price, or the existing zero sorting fallback.
     */
    value: (asset) => asset.price || 0,
    /** Render the holding's price without presenting unavailable pricing as zero.
     * @param asset - Normalized holding backing this row.
     * @returns Display pricing or the unavailable placeholder.
     */
    cell: (asset) => currency(asset.price),
  },
  {
    id: 'balance',
    label: 'Balance',
    width: 160,
    align: 'right',
    value: balance,
    cell: balance,
  },
  {
    id: 'value',
    label: 'Value',
    width: 150,
    align: 'right',
    /** Extract the existing valuation sort key.
     * @param asset - Normalized holding backing this row.
     * @returns Its available value, or the existing zero sorting fallback.
     */
    value: (asset) => asset.value || 0,
    /** Render available holding valuation without inventing missing values.
     * @param asset - Normalized holding backing this row.
     * @returns Display valuation or the unavailable placeholder.
     */
    cell: (asset) => currency(asset.value),
  },
  {
    id: 'valuation',
    label: 'Valuation',
    width: 105,
    /** Extract the holding's pricing-availability classification.
     * @param asset - Normalized holding backing this row.
     * @returns A priced/unpriced label based on valuation availability.
     */
    value: (asset) => (asset.value == null ? 'Unpriced' : 'Priced'),
    /** Render the holding's pricing-availability classification.
     * @param asset - Normalized holding backing this row.
     * @returns A styled priced/unpriced label, independently of its numeric balance.
     */
    cell: (asset) => (
      <span
        className={
          asset.value == null
            ? 'iris-valuation-status iris-valuation-status--unpriced'
            : 'iris-valuation-status'
        }
      >
        {asset.value == null ? 'Unpriced' : 'Priced'}
      </span>
    ),
  },
];
const activityColumns: VirtualTableColumn<TransactionRow>[] = [
  {
    id: 'time',
    label: 'Time',
    width: 150,
    grow: 1,
    /** Extract the observation timestamp for sorting and filtering.
     * @param transaction - Normalized activity row.
     * @returns Timestamp text or an empty sorting value.
     */
    value: (transaction) => transaction.timestamp || '',
    /** Render the observation timestamp.
     * @param transaction - Normalized activity row.
     * @returns Local date/time text or the unavailable placeholder.
     */
    cell: (transaction) => dateTime(transaction.timestamp),
  },
  {
    id: 'action',
    label: 'Action',
    width: 115,
    grow: 1,
    /** Extract the activity action for sorting and filtering.
     * @param transaction - Normalized activity row.
     * @returns The action or its unknown-action fallback.
     */
    value: (transaction) => transaction.action || 'Unknown',
    /** Render the activity action.
     * @param transaction - Normalized activity row.
     * @returns The action or its unknown-action fallback.
     */
    cell: (transaction) => transaction.action || 'Unknown',
  },
  {
    id: 'sender',
    label: 'Sender',
    width: 150,
    grow: 2,
    /** Extract the full sender identity for sorting and filtering.
     * @param transaction - Normalized activity row.
     * @returns The full sender address, or an empty sorting value.
     */
    value: (transaction) => transaction.sender || '',
    /** Render the sender without shortening its navigation target.
     * @param transaction - Normalized activity row.
     * @returns A wallet link or the unavailable placeholder.
     */
    cell: (transaction) =>
      transaction.sender ? (
        <a
          href={`/wallet/${encodeURIComponent(transaction.sender)}`}
          title={`Open ${transaction.sender} in Iris`}
        >
          {short(transaction.sender)}
        </a>
      ) : (
        '—'
      ),
  },
  {
    id: 'recipient',
    label: 'Recipient',
    width: 150,
    grow: 2,
    /** Extract the full recipient identity for sorting and filtering.
     * @param transaction - Normalized activity row.
     * @returns The full recipient address, or an empty sorting value.
     */
    value: (transaction) => transaction.recipient || '',
    /** Render the recipient without shortening its navigation target.
     * @param transaction - Normalized activity row.
     * @returns A wallet link or the unavailable placeholder.
     */
    cell: (transaction) =>
      transaction.recipient ? (
        <a
          href={`/wallet/${encodeURIComponent(transaction.recipient)}`}
          title={`Open ${transaction.recipient} in Iris`}
        >
          {short(transaction.recipient)}
        </a>
      ) : (
        '—'
      ),
  },
  {
    id: 'amount',
    label: 'Amount',
    width: 140,
    grow: 1,
    /** Extract the exact source amount for sorting and filtering.
     * @param transaction - Normalized activity row.
     * @returns Exact amount text, or an empty sorting value.
     */
    value: (transaction) => transaction.amount || '',
    /** Render exact atomic quantities with their decimal context.
     * @param transaction - Normalized activity row.
     * @returns Atomic-unit text and available decimals, or the unavailable placeholder.
     */
    cell: (transaction) =>
      transaction.amount === null
        ? '—'
        : `${transaction.amount} atomic units (decimals: ${transaction.decimals ?? '?'})`,
    align: 'right',
  },
  {
    id: 'transaction',
    label: 'Transaction',
    width: 170,
    grow: 1.5,
    /** Extract full transaction identity for sorting and filtering.
     * @param transaction - Normalized activity row.
     * @returns The full transaction identifier, not its shortened display label.
     */
    value: (transaction) => transaction.id,
    /** Render an allowlisted explorer link for the full transaction identity.
     * @param transaction - Normalized activity row.
     * @returns A safe explorer link or an unlinked shortened identifier.
     */
    cell: (transaction) => {
      const url = solanaExplorerUrl('tx', transaction.id);
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={transaction.id}
        >
          {short(transaction.id)}
        </a>
      ) : (
        short(transaction.id)
      );
    },
  },
];

/** Render wallet holdings, valuation and cursor-paginated transaction activity.
 * @returns Wallet resource panels with independent loading and pagination feedback.
 */
export default function Wallet() {
  const { address = '' } = useParams();
  const navigate = useNavigate();
  const summary = useWorkerResource(
    (options) => workerApi.wallet(address, options),
    [address],
  );
  const firstPage = useWorkerResource(
    (options) => workerApi.walletTransactions(address, options),
    [address],
  );
  const [extraPages, setExtraPages] = useState<Activity[]>([]);
  // Undefined uses the first page's cursor; null means pagination has ended.
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<unknown>(null);
  const wallet = walletFrom(summary.data);
  const firstTransactions = transactionsFrom(firstPage.data);
  const nextCursor =
    cursor === undefined ? nextCursorFrom(firstPage.data) : cursor;
  const transactions = [...firstTransactions, ...extraPages].filter(
    (activity, index, items) =>
      items.findIndex(
        (candidate) => activityKey(candidate) === activityKey(activity),
      ) === index,
  );
  const transactionRows = transactionRowsFrom(transactions);
  const explorerUrl = solanaExplorerUrl('address', wallet?.address);
  const invalidAddress =
    isRecord(summary.error) &&
    (summary.error.code === 'INVALID_WALLET_ADDRESS' ||
      summary.error.status === 400);
  useEffect(() => {
    setExtraPages([]);
    setCursor(undefined);
    setLoadingMore(false);
    setLoadMoreError(null);
  }, [address]);
  /** Request the next transaction page without duplicating in-flight pagination. */
  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await workerApi.walletTransactions(address, {
        cursor: nextCursor,
      });
      setExtraPages((items) => [...items, ...transactionsFrom(page.data)]);
      setCursor(nextCursorFrom(page.data));
    } catch (error) {
      setLoadMoreError(error);
    } finally {
      setLoadingMore(false);
    }
  }
  const valuation = wallet?.valuation ?? {
    holdingCount: undefined,
    pricedHoldingCount: undefined,
    unpricedHoldingCount: undefined,
    complete: false,
    pricedSubtotalUsd: null,
  };
  const assetCount = wallet?.assets?.length;
  const transactionCount = transactions.length;
  return (
    <div className="iris-shell">
      <Navbar />
      <DataStatus
        meta={summary.meta || firstPage.meta}
        error={summary.error || firstPage.error}
      />
      <main id="iris-main" tabIndex={-1} className="iris-page">
        <SaveControl kind="wallet" address={address} />
        <ResourceFeedback
          label="Wallet data"
          error={invalidAddress ? null : summary.error}
          busy={summary.loading || summary.refreshing}
          hasData={Boolean(wallet)}
          errorMessage="Wallet data is currently unavailable from the Worker."
          onRetry={summary.refetch}
          retryLabel="Retry wallet"
        />
        {invalidAddress ? (
          <Unavailable
            address={address}
            text="This is not a valid Solana wallet address."
          />
        ) : summary.error && !wallet ? null : !summary.loading && !wallet ? (
          <Unavailable address={address} text="No wallet data was returned." />
        ) : (
          <>
            <section
              className="iris-wallet-hero"
              aria-busy={(summary.loading && !wallet) || undefined}
            >
              <div className="iris-wallet-hero-heading">
                <p className="iris-eyebrow">Public wallet</p>
                <h1>
                  {summary.loading && !wallet ? (
                    <ValueSkeleton width="300px" />
                  ) : (
                    wallet?.label || address
                  )}
                </h1>
                {summary.loading && !wallet ? (
                  <p>
                    <ValueSkeleton width="390px" />
                  </p>
                ) : (
                  wallet?.description && <p>{wallet.description}</p>
                )}
                {summary.loading && !wallet ? (
                  <p className="iris-wallet-address">
                    <ValueSkeleton width="280px" />
                  </p>
                ) : explorerUrl ? (
                  <a
                    className="iris-wallet-address"
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {wallet?.address}
                  </a>
                ) : (
                  <p className="iris-wallet-address">{address}</p>
                )}
              </div>
              <div className="iris-wallet-primary-value">
                <span>Priced subtotal</span>
                <strong>
                  {summary.loading && !wallet ? (
                    <ValueSkeleton width="150px" />
                  ) : (
                    currency(wallet?.totalValue)
                  )}
                </strong>
                <small>
                  {summary.loading && !wallet ? (
                    <ValueSkeleton width="180px" />
                  ) : valuation.complete ? (
                    'All returned holdings are priced'
                  ) : (
                    'Subtotal excludes unpriced holdings'
                  )}
                </small>
              </div>
              <div className="iris-wallet-hero-metrics">
                <div>
                  <span>Assets</span>
                  <strong>
                    {summary.loading && !wallet ? (
                      <ValueSkeleton width="42px" />
                    ) : (
                      assetCount?.toLocaleString() || '—'
                    )}
                  </strong>
                  <small>Assets returned by the Worker</small>
                </div>
                <div>
                  <span>Transactions</span>
                  <strong>
                    {firstPage.loading && !transactionCount ? (
                      <ValueSkeleton width="42px" />
                    ) : (
                      transactionCount.toLocaleString()
                    )}
                  </strong>
                  <small>Transactions returned by Helius</small>
                </div>
              </div>
            </section>
            <div className="iris-wallet-disclosures">
              <p className="iris-disclosure">
                Public on-chain data only. Valuations can be partial when
                balances are not priced.
              </p>
              {wallet?.truncated && (
                <p className="iris-disclosure iris-disclosure--warning">
                  The Worker truncated this wallet's returned balances; the
                  displayed holdings are incomplete.
                </p>
              )}
            </div>
            <section className="iris-section">
              <div className="iris-panel-heading">
                <div>
                  <p className="iris-eyebrow">Portfolio</p>
                  <h2>Holdings</h2>
                </div>
              </div>
              <VirtualTable
                columns={holdingsColumns}
                data={wallet?.assets || []}
                loading={summary.loading && !wallet}
                emptyLabel="No assets are available for this public wallet."
                filterPlaceholder="Filter holdings"
                onRowClick={(asset) => {
                  if (asset.mint)
                    void navigate(`/asset/${encodeURIComponent(asset.mint)}`);
                }}
              />
            </section>
            <section className="iris-section iris-holder-panel iris-onchain-intelligence iris-helius-card">
              <div className="iris-helius-topline">
                <img
                  className="iris-helius-logo"
                  src="/helius-dark.svg"
                  alt="Helius"
                />
                <span>Network</span>
              </div>
              <div className="iris-intelligence-tabs">
                <h2 className="active">Transactions</h2>
              </div>
              <ResourceFeedback
                label="Wallet activity"
                error={firstPage.error}
                busy={firstPage.loading || firstPage.refreshing}
                hasData={transactions.length > 0}
                errorMessage="Helius transaction history is unavailable."
                onRetry={firstPage.refetch}
                retryLabel="Retry activity"
              />
              {firstPage.error && !transactions.length ? null : (
                <>
                  <VirtualTable
                    columns={activityColumns}
                    data={transactionRows}
                    loading={firstPage.loading && !transactionRows.length}
                    emptyLabel="No recent activity is available for this public wallet."
                    filterPlaceholder="Filter wallet transfers"
                  />
                  <ResourceFeedback
                    label="More transactions"
                    error={loadMoreError}
                    busy={loadingMore}
                    hasData={transactions.length > 0}
                    errorMessage="Could not load more transactions."
                    onRetry={() => void loadMore()}
                  />
                  {nextCursor && (
                    <div className="iris-load-more">
                      <button
                        className="iris-retry"
                        onClick={() => void loadMore()}
                        disabled={loadingMore}
                      >
                        {loadingMore ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
/** Wallet identity and controlled explanation for an unavailable resource. */
interface UnavailableProps {
  address: string;
  text: string;
}

/** Render the wallet-specific unavailable state with its address context.
 * @param props - Full wallet address and controlled resource explanation.
 * @returns An accessible unavailable-state notice retaining the requested wallet identity.
 */
function Unavailable(props: UnavailableProps) {
  const { address, text } = props;
  return (
    <div className="iris-loading" role="status">
      <div>
        <p>{text}</p>
        <p className="iris-wallet-address">{address}</p>
      </div>
    </div>
  );
}
