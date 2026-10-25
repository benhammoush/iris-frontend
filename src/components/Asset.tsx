/**
 * Asset detail resources, historical pagination and accessible intelligence tabs.
 * @packageDocumentation
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';
import SaveControl from './SaveControl';
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
import ResourceFeedback from './ResourceFeedback';

/** Format a known monetary value for display and preserve the unavailable-data fallback.
 * @param value - Available USD metric, or an unavailable value.
 * @param digits - Maximum displayed fractional digits.
 * @returns Formatted currency text or the unavailable placeholder.
 */
const currency = (value: number | null | undefined, digits = 5) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: digits })}`;
/** Format a known asset price without presenting missing pricing as zero.
 * @param value - Available USD price, or an unavailable value.
 * @returns USD price text with the existing significant-digit limit, or a placeholder.
 */
const price = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { maximumSignificantDigits: 5 })}`;
/** Format a monetary metric using compact display notation.
 * @param value - Available USD metric, or an unavailable value.
 * @returns Compact currency text or the unavailable placeholder.
 */
const compactCurrency = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(Number(value));
/** Format a display quantity without changing its underlying exact representation.
 * @param value - Available numeric display quantity, or an unavailable value.
 * @returns Compact display text; exact source quantities remain unchanged.
 */
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
/** Normalized asset transaction identity and display fields. */
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
/** Account identity and quantity fields used by asset-distribution rows. */
type DistributionAccount = {
  rank: number;
  tokenAccount: string;
  owner: string | null;
  amount: string;
  supplyPercent: string | null;
  frozen: boolean | null;
};
/** Format an available observation timestamp for the user.
 * @param value - Optional observation timestamp text.
 * @returns Local date/time text or the unknown-time label.
 */
const dateTime = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('en-US')
    : 'Unknown time';
/** Compute a display USD value only when both quantity and current price are usable.
 * @param amount - Exact source quantity represented as decimal text, or null.
 * @param priceUsd - Current USD price, or null when unavailable.
 * @returns Display-only USD valuation or the unavailable placeholder.
 */
const currentUsdValue = (amount: string | null, priceUsd: number | null) =>
  amount === null ||
  priceUsd === null ||
  !Number.isFinite(Number(amount)) ||
  !Number.isFinite(priceUsd)
    ? '—'
    : currency(Number(amount) * priceUsd, 2);
/** Define transaction table columns using the current display price.
 * @param priceUsd - Current USD price used only for the display valuation column.
 * @returns Column contracts retaining full transaction identities and exact source amounts.
 */
const transactionColumns = (
  priceUsd: number | null,
): VirtualTableColumn<MintTransaction>[] => [
  {
    id: 'time',
    label: 'Time',
    width: 150,
    grow: 1,
    /** Extract the observation timestamp for sorting and filtering.
     * @param transaction - Normalized transaction backing this row.
     * @returns Its timestamp text, or an empty sorting value.
     */
    value: (transaction) => transaction.timestamp || '',
    /** Render the observation timestamp.
     * @param transaction - Normalized transaction backing this row.
     * @returns Local date/time text or the unknown-time label.
     */
    cell: (transaction) => dateTime(transaction.timestamp),
  },
  {
    id: 'action',
    label: 'Action',
    width: 115,
    grow: 1,
    /** Extract the transaction action for sorting and filtering.
     * @param transaction - Normalized transaction backing this row.
     * @returns The action label or its unknown-action fallback.
     */
    value: (transaction) => transaction.action || 'Unknown',
    /** Render the transaction action.
     * @param transaction - Normalized transaction backing this row.
     * @returns The action label or its unknown-action fallback.
     */
    cell: (transaction) => transaction.action || 'Unknown',
  },
  {
    id: 'sender',
    label: 'Sender',
    width: 150,
    grow: 2,
    /** Extract the sender identity for sorting and filtering.
     * @param transaction - Normalized transaction backing this row.
     * @returns The full sender address, or an empty sorting value.
     */
    value: (transaction) => transaction.sender || '',
    /** Render the sender without shortening its navigation identity.
     * @param transaction - Normalized transaction backing this row.
     * @returns A wallet link or the mint-origin label.
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
        'Mint'
      ),
  },
  {
    id: 'recipient',
    label: 'Recipient',
    width: 150,
    grow: 2,
    /** Extract the recipient identity for sorting and filtering.
     * @param transaction - Normalized transaction backing this row.
     * @returns The full recipient address, or an empty sorting value.
     */
    value: (transaction) => transaction.recipient || '',
    /** Render the recipient without shortening its navigation identity.
     * @param transaction - Normalized transaction backing this row.
     * @returns A wallet link or the burned-transfer label.
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
        'Burned'
      ),
  },
  {
    id: 'amount',
    label: 'Amount',
    width: 140,
    grow: 1,
    /** Extract the source amount for sorting and filtering.
     * @param transaction - Normalized transaction backing this row.
     * @returns Its exact amount text, or an empty sorting value.
     */
    value: (transaction) => transaction.amount || '',
    /** Render the source amount without numeric conversion.
     * @param transaction - Normalized transaction backing this row.
     * @returns Its exact amount text or the unavailable placeholder.
     */
    cell: (transaction) => transaction.amount || '—',
    align: 'right',
  },
  {
    id: 'value',
    label: 'Value',
    width: 140,
    grow: 1.3,
    /** Extract the display USD valuation for sorting and filtering.
     * @param transaction - Normalized transaction backing this row.
     * @returns The display valuation or its unavailable placeholder.
     */
    value: (transaction) => currentUsdValue(transaction.amount, priceUsd),
    /** Render a display-only USD valuation without changing the source amount.
     * @param transaction - Normalized transaction backing this row.
     * @returns The display valuation or its unavailable placeholder.
     */
    cell: (transaction) => currentUsdValue(transaction.amount, priceUsd),
    align: 'right',
  },
  {
    id: 'signature',
    label: 'Transaction',
    width: 170,
    grow: 1.5,
    /** Extract the full signature for sorting and filtering.
     * @param transaction - Normalized transaction backing this row.
     * @returns The transaction signature, never its shortened display label.
     */
    value: (transaction) => transaction.signature,
    /** Render an allowlisted explorer link for the full transaction identity.
     * @param transaction - Normalized transaction backing this row.
     * @returns A safe explorer link or the shortened identifier without a link.
     */
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
/** Define account-distribution table columns using the current display price.
 * @param priceUsd - Current USD price used only for display valuation.
 * @returns Column contracts preserving exact account identities and source quantities.
 */
const distributionColumns = (
  priceUsd: number | null,
): VirtualTableColumn<DistributionAccount>[] => [
  {
    id: 'rank',
    label: 'Rank',
    width: 70,
    grow: 0.5,
    /** Extract the source rank for sorting and filtering.
     * @param account - Normalized distribution account backing this row.
     * @returns Its numeric rank.
     */
    value: (account) => account.rank,
    /** Render the source rank.
     * @param account - Normalized distribution account backing this row.
     * @returns Its display rank prefixed with a hash.
     */
    cell: (account) => `#${account.rank}`,
  },
  {
    id: 'owner',
    label: 'Wallet',
    width: 260,
    grow: 2,
    /** Extract the account's full display identity for sorting and filtering.
     * @param account - Normalized distribution account backing this row.
     * @returns Its owner address, or token-account identity when the owner is unavailable.
     */
    value: (account) => account.owner || account.tokenAccount,
    /** Render the account identity without shortening its navigation target.
     * @param account - Normalized distribution account backing this row.
     * @returns A wallet link or an unlinked token-account label.
     */
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
    /** Extract the exact source quantity for sorting and filtering.
     * @param account - Normalized distribution account backing this row.
     * @returns Its amount text without numeric conversion.
     */
    value: (account) => account.amount,
    /** Render the exact source quantity.
     * @param account - Normalized distribution account backing this row.
     * @returns Its amount text without numeric conversion.
     */
    cell: (account) => account.amount,
    align: 'right',
  },
  {
    id: 'value',
    label: 'Value',
    width: 220,
    grow: 2,
    /** Extract the display USD valuation for sorting and filtering.
     * @param account - Normalized distribution account backing this row.
     * @returns A display valuation or its unavailable placeholder.
     */
    value: (account) => currentUsdValue(account.amount, priceUsd),
    /** Render a display-only valuation without changing the source amount.
     * @param account - Normalized distribution account backing this row.
     * @returns A display valuation or its unavailable placeholder.
     */
    cell: (account) => currentUsdValue(account.amount, priceUsd),
    align: 'right',
  },
  {
    id: 'share',
    label: 'Supply share',
    width: 160,
    grow: 1.3,
    /** Extract the source supply share for sorting and filtering.
     * @param account - Normalized distribution account backing this row.
     * @returns Exact supply-share text, or an empty sorting value.
     */
    value: (account) => account.supplyPercent || '',
    /** Render supply share without numeric conversion.
     * @param account - Normalized distribution account backing this row.
     * @returns Exact percentage text or the unavailable placeholder.
     */
    cell: (account) =>
      account.supplyPercent === null ? '—' : `${account.supplyPercent}%`,
    align: 'right',
  },
];

/** Render asset data with independent loading, unavailable and historical-pagination states.
 * @returns Asset resources with independent loading, stale/failure and history-pagination feedback.
 */
export default function Asset() {
  const { mint = '' } = useParams();
  const [timeframe, setTimeframe] = useState<CandleTimeframe>('1H');
  const [olderCandles, setOlderCandles] = useState<
    ReturnType<typeof assetCandlesFrom>
  >([]);
  const [canLoadEarlier, setCanLoadEarlier] = useState(true);
  const loadingOlderRef = useRef(false);
  const olderRequest = useRef<AbortController | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderCandlesError, setOlderCandlesError] = useState<unknown>(null);
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
    setLoadingOlder(false);
    setOlderCandlesError(null);
    setIntelligenceTab('transactions');
    return () => {
      olderRequest.current?.abort();
      olderRequest.current = null;
    };
  }, [mint, timeframe]);
  /** A manual retry may recover failed history without enabling automatic retries.
   * @param retry - Whether the user explicitly requested recovery after a failed history load.
   */
  async function loadEarlierCandles(retry = false) {
    if (
      loadingOlderRef.current ||
      (!canLoadEarlier && !retry) ||
      !candles.length
    )
      return;
    const oldestTimestamp = Math.floor(
      new Date(candles[0].timestamp).valueOf() / 1000,
    );
    if (!Number.isSafeInteger(oldestTimestamp) || oldestTimestamp <= 0) return;
    loadingOlderRef.current = true;
    const controller = new AbortController();
    olderRequest.current = controller;
    setLoadingOlder(true);
    setOlderCandlesError(null);
    try {
      const result = await workerApi.assetCandles(
        mint,
        timeframe,
        { signal: controller.signal },
        oldestTimestamp,
      );
      if (controller.signal.aborted) return;
      const older = assetCandlesFrom(result.data);
      if (!older.length) {
        setCanLoadEarlier(false);
        return;
      }
      if (retry) setCanLoadEarlier(true);
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
    } catch (error) {
      if (!controller.signal.aborted) {
        setOlderCandlesError(error);
        setCanLoadEarlier(false);
      }
    } finally {
      if (olderRequest.current === controller) {
        olderRequest.current = null;
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }
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
      <main id="iris-main" tabIndex={-1} className="iris-page">
        <SaveControl kind="asset" address={mint} />
        <ResourceFeedback
          label="Asset data"
          error={result.error}
          busy={result.loading || result.refreshing}
          hasData={Boolean(asset)}
          errorMessage="Asset data is currently unavailable from the Worker."
          onRetry={result.refetch}
          retryLabel="Retry asset"
        />
        {result.error && !asset ? null : !result.loading && !asset ? (
          <p className="iris-loading">No asset was returned for {mint}.</p>
        ) : (
          <>
            <section
              className="iris-section iris-jupiter-dex iris-asset-jupiter-card"
              aria-busy={assetLoading || undefined}
            >
              <div className="iris-jupiter-dex-label">
                <JupiterLogo />
                <div>
                  <p>Jupiter</p>
                </div>
                <span className="iris-jupiter-badge">
                  Decentralised Exchange
                </span>
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
              aria-busy={
                (candlesResult.loading && !candles.length) || undefined
              }
            >
              <div className="iris-birdeye-card-header">
                <img
                  className="iris-birdeye-logo--dark"
                  src="/birdeye-on-dark.png"
                  alt="Birdeye"
                  width="130"
                  height="28"
                />
                <img
                  className="iris-birdeye-logo--light"
                  src="/birdeye-on-light.png"
                  alt="Birdeye"
                  width="130"
                  height="28"
                />
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
                      aria-pressed={timeframe === value}
                      onClick={() => setTimeframe(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <ResourceFeedback
                label="Price history"
                error={candlesResult.error}
                busy={candlesResult.loading || candlesResult.refreshing}
                hasData={candles.length > 0}
                onRetry={candlesResult.refetch}
                retryLabel="Retry price history"
              />
              <ResourceFeedback
                label="Earlier price history"
                error={olderCandlesError}
                busy={loadingOlder}
                hasData={candles.length > 0}
                onRetry={() => void loadEarlierCandles(true)}
                retryLabel="Retry earlier history"
              />
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
              ) : !candlesResult.error ? (
                <p className="iris-empty">No price history is available.</p>
              ) : null}
            </section>
            <IntelligencePanel
              tab={intelligenceTab}
              onTabChange={setIntelligenceTab}
              priceUsd={asset?.priceUsd ?? null}
              transactions={transactions}
              transactionLoading={
                transactionsResult.loading || transactionsResult.refreshing
              }
              transactionError={transactionsResult.error}
              retryTransactions={transactionsResult.refetch}
              distribution={distribution}
              distributionLoading={
                distributionResult.loading || distributionResult.refreshing
              }
              distributionError={distributionResult.error}
              retryDistribution={distributionResult.refetch}
            />
          </>
        )}
      </main>
    </div>
  );
}

/** Available percentage change for the asset heading. */
interface ChangeProps {
  value: number;
}

/** Render a signed percentage change with an explicit unavailable fallback.
 * @param props - Available percentage-change metric.
 * @returns The signed, styled 24-hour change label.
 */
function Change(props: ChangeProps) {
  const { value } = props;
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
/** Asset-metric label, display value and optional supporting detail. */
interface MetricProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

/** Render one labeled metric and its optional supporting detail.
 * @param props - Metric label, display content and optional supporting detail.
 * @returns The labeled metric without loading or normalizing data.
 */
function Metric(props: MetricProps) {
  const { label, value, detail = null } = props;
  return (
    <section className="iris-jupiter-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </section>
  );
}
/** Shorten a display identifier without changing the full value used by requests or links.
 * @param value - Optional full account or transaction identifier.
 * @returns Its shortened display label, or the absent-identity label.
 */
function short(value: string | null) {
  return value ? `${value.slice(0, 5)}...${value.slice(-5)}` : 'None';
}
/** Independent asset-transaction/distribution resources and controlled tab selection. */
interface IntelligencePanelProps {
  tab: 'transactions' | 'distribution';
  /** Notify the owner that the selected intelligence tab changed.
   * @param tab - Transactions or account-distribution panel to select.
   */
  onTabChange: (tab: 'transactions' | 'distribution') => void;
  priceUsd: number | null;
  transactions: MintTransaction[];
  transactionLoading: boolean;
  transactionError: unknown;
  /** Ask the owner to retry the failed transaction resource. */
  retryTransactions: () => void;
  distribution: DistributionAccount[];
  distributionLoading: boolean;
  distributionError: unknown;
  /** Ask the owner to retry the failed distribution resource. */
  retryDistribution: () => void;
}

/** Render accessible transaction and distribution tabs with independent resource feedback.
 * @param props - Controlled tab state, display price and independent resource/retry controls.
 * @returns Keyboard-accessible intelligence panels without mixing their resource states.
 */
function IntelligencePanel(props: IntelligencePanelProps) {
  const {
    tab,
    onTabChange,
    priceUsd,
    transactions,
    transactionLoading,
    transactionError,
    retryTransactions,
    distribution,
    distributionLoading,
    distributionError,
    retryDistribution,
  } = props;
  const id = useId();
  const transactionsTab = useRef<HTMLButtonElement>(null);
  const distributionTab = useRef<HTMLButtonElement>(null);
  /** Apply keyboard tab navigation while keeping focus and selection synchronized.
   * @param event - Keyboard interaction on the intelligence tab list.
   */
  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next =
      event.key === 'Home'
        ? 'transactions'
        : event.key === 'End'
          ? 'distribution'
          : event.key === 'ArrowLeft' || event.key === 'ArrowRight'
            ? tab === 'transactions'
              ? 'distribution'
              : 'transactions'
            : null;
    if (!next) return;
    event.preventDefault();
    onTabChange(next);
    (next === 'transactions'
      ? transactionsTab
      : distributionTab
    ).current?.focus();
  }
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
        onKeyDown={onTabKeyDown}
      >
        <button
          ref={transactionsTab}
          id={`${id}-transactions-tab`}
          role="tab"
          aria-controls={`${id}-transactions-panel`}
          tabIndex={tab === 'transactions' ? 0 : -1}
          aria-selected={tab === 'transactions'}
          className={tab === 'transactions' ? 'active' : ''}
          onClick={() => onTabChange('transactions')}
        >
          Transactions
        </button>
        <button
          ref={distributionTab}
          id={`${id}-distribution-tab`}
          role="tab"
          aria-controls={`${id}-distribution-panel`}
          tabIndex={tab === 'distribution' ? 0 : -1}
          aria-selected={tab === 'distribution'}
          className={tab === 'distribution' ? 'active' : ''}
          onClick={() => onTabChange('distribution')}
        >
          Largest accounts
        </button>
      </div>
      <div
        id={`${id}-transactions-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-transactions-tab`}
        hidden={tab !== 'transactions'}
        tabIndex={0}
      >
        {tab === 'transactions' && (
          <TransactionList
            priceUsd={priceUsd}
            transactions={transactions}
            loading={transactionLoading}
            error={transactionError}
            onRetry={retryTransactions}
          />
        )}
      </div>
      <div
        id={`${id}-distribution-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-distribution-tab`}
        hidden={tab !== 'distribution'}
        tabIndex={0}
      >
        {tab === 'distribution' && (
          <DistributionList
            priceUsd={priceUsd}
            accounts={distribution}
            loading={distributionLoading}
            error={distributionError}
            onRetry={retryDistribution}
          />
        )}
      </div>
    </section>
  );
}
/** Transaction-table data, display price and independent resource feedback. */
interface TransactionListProps {
  transactions: MintTransaction[];
  loading: boolean;
  error: unknown;
  priceUsd: number | null;
  /** Ask the resource owner to retry its failed load. */
  onRetry: () => void;
}

/** Render transaction rows or explicit loading, empty and failed states.
 * @param props - Transactions, display price and resource/retry state.
 * @returns Transaction feedback and a table without hiding retained rows on failure.
 */
function TransactionList(props: TransactionListProps) {
  const { transactions, loading, error, priceUsd, onRetry } = props;
  return (
    <>
      <ResourceFeedback
        label="Mint transaction history"
        error={error}
        busy={loading}
        hasData={transactions.length > 0}
        errorMessage="Helius transaction history is unavailable."
        onRetry={onRetry}
        retryLabel="Retry mint transactions"
      />
      {error && !transactions.length ? null : (
        <VirtualTable
          columns={transactionColumns(priceUsd)}
          data={transactions}
          loading={loading && !transactions.length}
          emptyLabel="No indexed mint-address transactions were returned."
          filterPlaceholder="Filter mint transfers"
        />
      )}
    </>
  );
}
/** Account-distribution data, display price and independent resource feedback. */
interface DistributionListProps {
  accounts: DistributionAccount[];
  loading: boolean;
  error: unknown;
  priceUsd: number | null;
  /** Ask the resource owner to retry its failed load. */
  onRetry: () => void;
}

/** Render account-distribution rows or explicit loading, empty and failed states.
 * @param props - Distribution accounts, display price and resource/retry state.
 * @returns Distribution feedback and a table retaining exact source quantities.
 */
function DistributionList(props: DistributionListProps) {
  const { accounts, loading, error, priceUsd, onRetry } = props;
  return (
    <>
      <ResourceFeedback
        label="Largest accounts"
        error={error}
        busy={loading}
        hasData={accounts.length > 0}
        errorMessage="Helius distribution data is unavailable."
        onRetry={onRetry}
        retryLabel="Retry largest accounts"
      />
      {error && !accounts.length ? null : (
        <VirtualTable
          columns={distributionColumns(priceUsd)}
          data={accounts}
          loading={loading && !accounts.length}
          emptyLabel="No largest token accounts were returned."
          filterPlaceholder="Filter largest accounts"
        />
      )}
    </>
  );
}
