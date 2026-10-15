import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import ValueSkeleton from './ValueSkeleton';

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
type Activity = {
  id?: string;
  timestamp?: string;
  type?: string;
  source?: string;
  status?: string;
  description?: string;
  transfers?: Transfer[];
};
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
const currency = (value: number | undefined | null) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const balance = (asset: Holding) => {
  const value =
    asset.displayBalance ?? asset.amount ?? asset.balance ?? asset.rawBalance;
  return value == null ? '—' : String(value);
};
const dateTime = (value: string | undefined) => {
  const date = value && new Date(value);
  return date && !Number.isNaN(date.valueOf())
    ? date.toLocaleString('en-US')
    : value || '-';
};
const short = (value: string | null | undefined) =>
  value ? `${value.slice(0, 5)}...${value.slice(-5)}` : '—';
const activityKey = (activity: Activity) =>
  activity.id ||
  `${activity.timestamp || ''}:${activity.type || ''}:${activity.description || ''}`;
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
    value: (asset) => `${asset.symbol || ''} ${asset.name || ''}`,
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
    value: (asset) => asset.price || 0,
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
    value: (asset) => asset.value || 0,
    cell: (asset) => currency(asset.value),
  },
  {
    id: 'valuation',
    label: 'Valuation',
    width: 105,
    value: (asset) => (asset.value == null ? 'Unpriced' : 'Priced'),
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
    value: (transaction) => transaction.timestamp || '',
    cell: (transaction) => dateTime(transaction.timestamp),
  },
  {
    id: 'action',
    label: 'Action',
    width: 115,
    grow: 1,
    value: (transaction) => transaction.action || 'Unknown',
    cell: (transaction) => transaction.action || 'Unknown',
  },
  {
    id: 'sender',
    label: 'Sender',
    width: 150,
    grow: 2,
    value: (transaction) => transaction.sender || '',
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
    value: (transaction) => transaction.recipient || '',
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
    value: (transaction) => transaction.amount || '',
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
    value: (transaction) => transaction.id,
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
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<unknown>(null);
  const wallet = walletFrom(summary.data);
  const firstTransactions = transactionsFrom(firstPage.data);
  const nextCursor = nextCursorFrom(firstPage.data) ?? cursor;
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
    setCursor(null);
    setLoadingMore(false);
    setLoadMoreError(null);
  }, [address]);
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
      {invalidAddress ? (
        <Unavailable
          address={address}
          text="This is not a valid Solana wallet address."
        />
      ) : summary.error && !wallet ? (
        <Unavailable
          address={address}
          text="Wallet data is currently unavailable from the Worker."
        />
      ) : !summary.loading && !wallet ? (
        <Unavailable address={address} text="No wallet data was returned." />
      ) : (
        <main className="iris-page">
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
              Public on-chain data only. Valuations can be partial when balances
              are not priced.
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
              onRowClick={(asset) =>
                asset.mint &&
                navigate(`/asset/${encodeURIComponent(asset.mint)}`)
              }
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
            <div
              className="iris-intelligence-tabs"
              role="tablist"
              aria-label="On-chain intelligence"
            >
              <button role="tab" aria-selected="true" className="active">
                Transactions
              </button>
            </div>
            {firstPage.error && !transactions.length ? (
              <div className="iris-wallet-error">
                <p>Helius transaction history is unavailable.</p>
                <button className="iris-retry" onClick={firstPage.refetch}>
                  Retry activity
                </button>
              </div>
            ) : (
              <>
                <VirtualTable
                  columns={activityColumns}
                  data={transactionRows}
                  loading={firstPage.loading && !transactionRows.length}
                  emptyLabel="No recent activity is available for this public wallet."
                  filterPlaceholder="Filter wallet transfers"
                />
                {loadMoreError && (
                  <div className="iris-wallet-pagination-error">
                    <span>Could not load more transactions.</span>
                    <button className="iris-retry" onClick={loadMore}>
                      Retry
                    </button>
                  </div>
                )}
                {nextCursor && (
                  <div className="iris-load-more">
                    <button
                      className="iris-retry"
                      onClick={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
function Unavailable({ address, text }: { address: string; text: string }) {
  return (
    <main className="iris-loading">
      <div>
        <p>{text}</p>
        <p className="iris-wallet-address">{address}</p>
      </div>
    </main>
  );
}
