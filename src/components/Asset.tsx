import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { workerApi } from '../api/worker';
import type { CandleTimeframe } from '../api/contracts';
import { isRecord } from '../data/record';
import {
  assetCandlesFrom,
  assetDistributionFrom,
  assetTransactionsFrom,
  assetsFrom,
} from '../data/normalizers';
import { useWorkerResource } from '../hooks/useWorkerResource';
import DataStatus from './DataStatus';
import Navbar from './Navbar';
import AssetIcon from './AssetIcon';
import {
  CandlestickChart,
  VirtualTable,
  type VirtualTableColumn,
} from '../design-system';
import { solanaExplorerUrl } from '../data/solana';
import ValueSkeleton from './ValueSkeleton';
import { JupiterLogo } from './Home';

const currency = (value: number | null | undefined, digits = 5) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: digits })}`;
const price = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { maximumSignificantDigits: 5 })}`;
const compactCurrency = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(Number(value));
const compactQuantity = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(Number(value));
const primaryTimeframes: [string, CandleTimeframe][] = [
  ['1m', '1m'],
  ['30m', '30m'],
  ['1h', '1H'],
  ['1d', '1D'],
  ['1mn', '1M'],
];
type MintTransaction = {
  signature: string;
  timestamp: string | null;
  action: string | null;
  protocol: string | null;
  summary: string | null;
  transferIndex: number;
  sender: string | null;
  recipient: string | null;
  amount: string | null;
};
type DistributionAccount = {
  rank: number;
  tokenAccount: string;
  owner: string | null;
  amount: string;
  supplyPercent: string | null;
  frozen: boolean | null;
};
const dateTime = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('en-US')
    : 'Unknown time';
const currentUsdValue = (amount: string | null, priceUsd: number | null) =>
  amount === null ||
  priceUsd === null ||
  !Number.isFinite(Number(amount)) ||
  !Number.isFinite(priceUsd)
    ? '—'
    : currency(Number(amount) * priceUsd, 2);
const transactionColumns = (
  priceUsd: number | null,
): VirtualTableColumn<MintTransaction>[] => [
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
        'Mint'
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
        'Burned'
      ),
  },
  {
    id: 'amount',
    label: 'Amount',
    width: 140,
    grow: 1,
    value: (transaction) => transaction.amount || '',
    cell: (transaction) => transaction.amount || '—',
    align: 'right',
  },
  {
    id: 'value',
    label: 'Value',
    width: 140,
    grow: 1.3,
    value: (transaction) => currentUsdValue(transaction.amount, priceUsd),
    cell: (transaction) => currentUsdValue(transaction.amount, priceUsd),
    align: 'right',
  },
  {
    id: 'signature',
    label: 'Transaction',
    width: 170,
    grow: 1.5,
    value: (transaction) => transaction.signature,
    cell: (transaction) => {
      const url = solanaExplorerUrl('tx', transaction.signature);
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={transaction.signature}
        >
          {short(transaction.signature)}
        </a>
      ) : (
        short(transaction.signature)
      );
    },
  },
];
const distributionColumns = (
  priceUsd: number | null,
): VirtualTableColumn<DistributionAccount>[] => [
  {
    id: 'rank',
    label: 'Rank',
    width: 70,
    grow: 0.5,
    value: (account) => account.rank,
    cell: (account) => `#${account.rank}`,
  },
  {
    id: 'owner',
    label: 'Wallet',
    width: 260,
    grow: 2,
    value: (account) => account.owner || account.tokenAccount,
    cell: (account) =>
      account.owner ? (
        <a
          href={`/wallet/${encodeURIComponent(account.owner)}`}
          title={`Open ${account.owner} in Iris`}
        >
          {short(account.owner)}
        </a>
      ) : (
        short(account.tokenAccount)
      ),
  },
  {
    id: 'amount',
    label: 'Amount',
    width: 220,
    grow: 2,
    value: (account) => account.amount,
    cell: (account) => account.amount,
    align: 'right',
  },
  {
    id: 'value',
    label: 'Value',
    width: 220,
    grow: 2,
    value: (account) => currentUsdValue(account.amount, priceUsd),
    cell: (account) => currentUsdValue(account.amount, priceUsd),
    align: 'right',
  },
  {
    id: 'share',
    label: 'Supply share',
    width: 160,
    grow: 1.3,
    value: (account) => account.supplyPercent || '',
    cell: (account) =>
      account.supplyPercent === null ? '—' : `${account.supplyPercent}%`,
    align: 'right',
  },
];

export default function Asset() {
  const { mint = '' } = useParams();
  const [timeframe, setTimeframe] = useState<CandleTimeframe>('1H');
  const [olderCandles, setOlderCandles] = useState<
    ReturnType<typeof assetCandlesFrom>
  >([]);
  const [canLoadEarlier, setCanLoadEarlier] = useState(true);
  const loadingOlderRef = useRef(false);
  const result = useWorkerResource(
    (options) => workerApi.asset(mint, options),
    [mint],
  );
  const candlesResult = useWorkerResource(
    (options) => workerApi.assetCandles(mint, timeframe, options),
    [mint, timeframe],
  );
  const [intelligenceTab, setIntelligenceTab] = useState<
    'transactions' | 'distribution'
  >('transactions');
  const transactionsResult = useWorkerResource(
    (options) =>
      intelligenceTab === 'transactions'
        ? workerApi.assetTransactions(mint, options)
        : Promise.resolve({ data: null, meta: null }),
    [mint, intelligenceTab],
  );
  const distributionResult = useWorkerResource(
    (options) =>
      intelligenceTab === 'distribution'
        ? workerApi.assetDistribution(mint, options)
        : Promise.resolve({ data: null, meta: null }),
    [mint, intelligenceTab],
  );
  const assetData = isRecord(result.data)
    ? result.data.asset || result.data
    : result.data;
  const asset = assetsFrom(assetData ? [assetData] : [])[0];
  const transactions = assetTransactionsFrom(transactionsResult.data);
  const distribution = assetDistributionFrom(distributionResult.data);
  const baseCandles = assetCandlesFrom(candlesResult.data);
  const candlesByTimestamp = new Map<
    string,
    ReturnType<typeof assetCandlesFrom>[number]
  >();
  for (const candle of [...olderCandles, ...baseCandles])
    candlesByTimestamp.set(candle.timestamp, candle);
  const candles = [...candlesByTimestamp.values()].sort(
    (left, right) =>
      new Date(left.timestamp).valueOf() - new Date(right.timestamp).valueOf(),
  );
  useEffect(() => {
    setOlderCandles([]);
    setCanLoadEarlier(true);
    loadingOlderRef.current = false;
    setIntelligenceTab('transactions');
  }, [mint, timeframe]);
  async function loadEarlierCandles() {
    if (loadingOlderRef.current || !canLoadEarlier || !candles.length) return;
    const oldestTimestamp = Math.floor(
      new Date(candles[0].timestamp).valueOf() / 1000,
    );
    if (!Number.isSafeInteger(oldestTimestamp) || oldestTimestamp <= 0) return;
    loadingOlderRef.current = true;
    try {
      const result = await workerApi.assetCandles(
        mint,
        timeframe,
        undefined,
        oldestTimestamp,
      );
      const older = assetCandlesFrom(result.data);
      if (!older.length) {
        setCanLoadEarlier(false);
        return;
      }
      setOlderCandles((current) => {
        const existing = new Set(
          [...current, ...baseCandles].map((candle) => candle.timestamp),
        );
        const additions = older.filter(
          (candle) => !existing.has(candle.timestamp),
        );
        if (!additions.length) setCanLoadEarlier(false);
        return [...current, ...additions];
      });
    } catch {
      setCanLoadEarlier(false);
    } finally {
      loadingOlderRef.current = false;
    }
  }
  const explorerUrl = solanaExplorerUrl('address', asset?.mint);
  const activity = asset?.activity;
  const metrics: { label: string; value: string; detail?: string | null }[] = [
    asset?.marketCapUsd != null
      ? { label: 'Market cap', value: compactCurrency(asset.marketCapUsd) }
      : null,
    asset?.fullyDilutedValuationUsd != null
      ? {
          label: 'Fully diluted valuation',
          value: compactCurrency(asset.fullyDilutedValuationUsd),
        }
      : null,
    asset?.liquidityUsd != null
      ? { label: 'Liquidity', value: compactCurrency(asset.liquidityUsd) }
      : null,
    asset?.circulatingSupply != null
      ? {
          label: 'Circulating supply',
          value: compactQuantity(asset.circulatingSupply),
        }
      : null,
    activity?.volume24hUsd != null
      ? { label: '24H volume', value: compactCurrency(activity.volume24hUsd) }
      : null,
    asset?.quality?.organicScore != null
      ? {
          label: 'Organic score',
          value: Number(asset.quality.organicScore).toLocaleString('en-US', {
            maximumFractionDigits: 1,
          }),
          detail: asset.quality.organicScoreLabel || null,
        }
      : null,
  ].filter(
    (
      metric,
    ): metric is { label: string; value: string; detail?: string | null } =>
      metric !== null,
  );
  const assetLoading = result.loading && !asset;
  const displayedMetrics: {
    label: string;
    value: string;
    detail?: string | null;
  }[] = metrics.length
    ? metrics
    : [
        'Market cap',
        'Fully diluted valuation',
        'Liquidity',
        'Circulating supply',
        '24H volume',
        'Organic score',
      ].map((label) => ({ label, value: '' }));
  return (
    <div className="iris-shell">
      <Navbar />
      <DataStatus
        meta={result.meta || candlesResult.meta}
        error={result.error || candlesResult.error}
      />
      {result.error && !asset ? (
        <main className="iris-loading">
          Asset data is currently unavailable from the Worker.
        </main>
      ) : !result.loading && !asset ? (
        <main className="iris-loading">No asset was returned for {mint}.</main>
      ) : (
        <main className="iris-page">
          <section
            className="iris-section iris-jupiter-dex iris-asset-jupiter-card"
            aria-busy={assetLoading || undefined}
          >
            <div className="iris-jupiter-dex-label">
              <JupiterLogo />
              <div>
                <p>Jupiter</p>
              </div>
              <span className="iris-jupiter-badge">Decentralised Exchange</span>
            </div>
            <div className="iris-asset-jupiter-content">
              <div className="iris-asset-heading">
                <div className="iris-asset-identity">
                  {assetLoading ? (
                    <ValueSkeleton className="iris-value-skeleton--asset-icon" />
                  ) : (
                    <AssetIcon src={asset?.imageUrl} symbol={asset?.symbol} />
                  )}
                  <div>
                    <h1>
                      {assetLoading ? (
                        <ValueSkeleton width="190px" />
                      ) : (
                        <>
                          {asset?.name} <span>{asset?.symbol}</span>
                        </>
                      )}
                    </h1>
                    {assetLoading ? (
                      <ValueSkeleton width="220px" />
                    ) : (
                      explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={asset?.mint}
                        >
                          {asset?.mint}
                        </a>
                      )
                    )}
                  </div>
                </div>
                <div className="iris-hero-price">
                  <span>Current price</span>
                  <strong>
                    {assetLoading ? (
                      <ValueSkeleton width="118px" />
                    ) : (
                      price(asset?.priceUsd)
                    )}
                  </strong>
                  {!assetLoading && asset?.change24hPct != null && (
                    <Change value={asset.change24hPct} />
                  )}
                </div>
              </div>
              <div
                className="iris-jupiter-market-data"
                aria-label="Market metrics"
              >
                <div className="iris-jupiter-metrics">
                  {displayedMetrics.map((metric) => (
                    <Metric
                      label={metric.label}
                      value={
                        assetLoading ? (
                          <ValueSkeleton width="72%" />
                        ) : (
                          metric.value
                        )
                      }
                      detail={
                        assetLoading ? (
                          <ValueSkeleton width="48%" />
                        ) : (
                          metric.detail
                        )
                      }
                      key={metric.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section
            className="iris-section iris-asset-chart iris-birdeye-card"
            aria-busy={(candlesResult.loading && !candles.length) || undefined}
          >
            <div className="iris-birdeye-card-header">
              <img src="/birdeye.svg" alt="Birdeye" width="130" height="28" />
              <span>Market data</span>
            </div>
            <div className="iris-chart-toolbar">
              <div className="iris-birdeye-pair">
                <strong>
                  {assetLoading ? (
                    <ValueSkeleton width="78px" />
                  ) : (
                    `${asset?.symbol} / USD`
                  )}
                </strong>
                <span>Price and volume</span>
              </div>
              <div className="iris-timeframe" aria-label="Candle timeframe">
                {primaryTimeframes.map(([label, value]) => (
                  <button
                    key={value}
                    className={timeframe === value ? 'active' : ''}
                    onClick={() => setTimeframe(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {candles.length ? (
              <CandlestickChart
                candles={candles}
                canLoadEarlier={canLoadEarlier}
                onLoadEarlier={loadEarlierCandles}
                valueFormatter={price}
              />
            ) : candlesResult.loading ? (
              <div className="iris-chart-skeleton">
                <ValueSkeleton width="88%" />
                <ValueSkeleton width="74%" />
                <ValueSkeleton width="92%" />
              </div>
            ) : (
              <p className="iris-empty">No price history is available.</p>
            )}
          </section>
          <IntelligencePanel
            tab={intelligenceTab}
            onTabChange={setIntelligenceTab}
            priceUsd={asset?.priceUsd ?? null}
            transactions={transactions}
            transactionLoading={transactionsResult.loading}
            transactionError={transactionsResult.error}
            distribution={distribution}
            distributionLoading={distributionResult.loading}
            distributionError={distributionResult.error}
          />
        </main>
      )}
    </div>
  );
}

function Change({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`iris-change ${positive ? 'iris-positive' : 'iris-negative'}`}
    >
      {positive ? '+' : ''}
      {value.toFixed(2)}% 24H
    </span>
  );
}
function Metric({
  label,
  value,
  detail = null,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <section className="iris-jupiter-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </section>
  );
}
function short(value: string | null) {
  return value ? `${value.slice(0, 5)}...${value.slice(-5)}` : 'None';
}
function IntelligencePanel({
  tab,
  onTabChange,
  priceUsd,
  transactions,
  transactionLoading,
  transactionError,
  distribution,
  distributionLoading,
  distributionError,
}: {
  tab: 'transactions' | 'distribution';
  onTabChange: (tab: 'transactions' | 'distribution') => void;
  priceUsd: number | null;
  transactions: MintTransaction[];
  transactionLoading: boolean;
  transactionError: unknown;
  distribution: DistributionAccount[];
  distributionLoading: boolean;
  distributionError: unknown;
}) {
  return (
    <section className="iris-section iris-holder-panel iris-onchain-intelligence iris-helius-card">
      <div className="iris-helius-topline">
        <img className="iris-helius-logo" src="/helius-dark.svg" alt="Helius" />
        <span>Network</span>
      </div>
      <div
        className="iris-intelligence-tabs"
        role="tablist"
        aria-label="On-chain intelligence"
      >
        <button
          role="tab"
          aria-selected={tab === 'transactions'}
          className={tab === 'transactions' ? 'active' : ''}
          onClick={() => onTabChange('transactions')}
        >
          Transactions
        </button>
        <button
          role="tab"
          aria-selected={tab === 'distribution'}
          className={tab === 'distribution' ? 'active' : ''}
          onClick={() => onTabChange('distribution')}
        >
          Largest accounts
        </button>
      </div>
      {tab === 'transactions' ? (
        <TransactionList
          priceUsd={priceUsd}
          transactions={transactions}
          loading={transactionLoading}
          error={transactionError}
        />
      ) : (
        <DistributionList
          priceUsd={priceUsd}
          accounts={distribution}
          loading={distributionLoading}
          error={distributionError}
        />
      )}
    </section>
  );
}
function TransactionList({
  transactions,
  loading,
  error,
  priceUsd,
}: {
  transactions: MintTransaction[];
  loading: boolean;
  error: unknown;
  priceUsd: number | null;
}) {
  return error && !transactions.length ? (
    <p className="iris-empty">Helius transaction history is unavailable.</p>
  ) : (
    <VirtualTable
      columns={transactionColumns(priceUsd)}
      data={transactions}
      loading={loading && !transactions.length}
      emptyLabel="No indexed mint-address transactions were returned."
      filterPlaceholder="Filter mint transfers"
    />
  );
}
function DistributionList({
  accounts,
  loading,
  error,
  priceUsd,
}: {
  accounts: DistributionAccount[];
  loading: boolean;
  error: unknown;
  priceUsd: number | null;
}) {
  return error && !accounts.length ? (
    <p className="iris-empty">Helius distribution data is unavailable.</p>
  ) : (
    <VirtualTable
      columns={distributionColumns(priceUsd)}
      data={accounts}
      loading={loading && !accounts.length}
      emptyLabel="No largest token accounts were returned."
      filterPlaceholder="Filter largest accounts"
    />
  );
}
