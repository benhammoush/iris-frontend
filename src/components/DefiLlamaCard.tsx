/**
 * External exchange and protocol metrics with explicit unavailable and refresh states.
 * @packageDocumentation
 */

import AssetIcon from './AssetIcon';
import { ValueSkeleton } from '../design-system';
import ResourceFeedback from './ResourceFeedback';

/** Normalized exchange-volume dashboard metrics. */
type Dex = {
  name: string;
  slug: string | null;
  logo: string | null;
  total24hUsd: number | null;
  total7dUsd: number | null;
  change1dPct: number | null;
};
/** Normalized protocol dashboard metrics. */
type Protocol = {
  name: string;
  slug: string | null;
  logo: string | null;
  category: string | null;
  solanaTvlUsd: number | null;
  change1dPct: number | null;
  change7dPct: number | null;
};
/** External dashboard collections and their observation metadata. */
type Dashboard = {
  dexes: {
    total24hUsd: number | null;
    total7dUsd: number | null;
    items: Dex[];
  };
  protocols: { total: number | null; items: Protocol[] };
};

/** Format a known monetary value for display and preserve the unavailable-data fallback.
 * @param value - Available USD metric, or an unavailable value.
 * @returns Formatted currency text or the unavailable placeholder.
 */
const currency = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(value);
/** Format an available count while retaining an unavailable fallback.
 * @param value - Available dashboard count, or an unavailable value.
 * @returns Localized count text or the unavailable placeholder.
 */
const count = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-US');
const preloadImage = {
  fetchpriority: 'high',
};

/** Nullable percentage-change metric. */
interface ChangeProps {
  value: number | null;
}

/** Render a signed percentage change with an explicit unavailable fallback.
 * @param props - Nullable percentage-change metric.
 * @returns Signed display text or an unavailable placeholder.
 */
function Change(props: ChangeProps) {
  const { value } = props;
  if (value === null || !Number.isFinite(value))
    return <span className="iris-muted">—</span>;
  return (
    <span className={value >= 0 ? 'iris-positive' : 'iris-negative'}>
      {value >= 0 ? '+' : ''}
      {value.toFixed(2)}%
    </span>
  );
}

/** External protocol identity and visible link content. */
interface DefiLlamaLinkProps {
  slug: string | null;
  children: React.ReactNode;
}

/** Link the supported dashboard entity to its external reference.
 * @param props - Optional protocol slug and visible content.
 * @returns An encoded external reference, or unlinked content when identity is unavailable.
 */
function DefiLlamaLink(props: DefiLlamaLinkProps) {
  const { slug, children } = props;
  return slug ? (
    <a
      href={`https://defillama.com/protocol/${encodeURIComponent(slug)}`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ) : (
    <span>{children}</span>
  );
}

/** Normalized dashboard data and independent load/refresh controls. */
interface DefiLlamaCardProps {
  dashboard: Dashboard | null;
  loading: boolean;
  error: unknown;
  refreshing?: boolean;
  /** Ask the resource owner to retry its failed load. */
  onRetry?: () => void;
}

/** Render independently available dashboard metrics and their refresh or failure state.
 * @param props - Dashboard snapshot, independent resource state and explicit retry control.
 * @returns Available metrics or accessible loading, empty and failure feedback.
 */
export default function DefiLlamaCard(props: DefiLlamaCardProps) {
  const { dashboard, loading, error, refreshing = false, onRetry } = props;
  const pending = loading && !dashboard;
  return (
    <section
      className="iris-defillama-card"
      aria-label="DefiLlama Solana dashboard"
    >
      <div className="iris-defillama-topline">
        <img
          className="iris-defillama-logo"
          src="/assets/defillama.webp"
          height="37.1"
          width="108.5"
          alt="DefiLlama"
          {...preloadImage}
          loading="eager"
          decoding="sync"
        />
        <a href="https://defillama.com" target="_blank" rel="noreferrer">
          Defi
        </a>
      </div>
      <ResourceFeedback
        label="DeFi metrics"
        error={error}
        busy={loading || refreshing}
        hasData={Boolean(dashboard)}
        errorMessage="DeFi metrics are unavailable."
        onRetry={onRetry}
        retryLabel="Retry DeFi metrics"
      />
      {!loading && !error && !dashboard && (
        <p className="iris-defillama-state">No DeFi metrics are available.</p>
      )}
      {(dashboard || pending) && (
        <div
          className="iris-catalog-lists iris-defillama-lists"
          aria-busy={pending || undefined}
        >
          <section
            className="iris-section iris-catalog-list iris-catalog-list--volume"
            aria-labelledby="iris-defillama-dexes"
          >
            <div className="iris-catalog-list-heading">
              <span aria-hidden="true" />
              <div>
                <h2 id="iris-defillama-dexes">Top DEXes</h2>
                <small>
                  {pending ? (
                    <ValueSkeleton width="130px" />
                  ) : (
                    <>
                      24H {currency(dashboard?.dexes.total24hUsd)} · 7D{' '}
                      {currency(dashboard?.dexes.total7dUsd)}
                    </>
                  )}
                </small>
              </div>
            </div>
            {pending ? (
              <PlaceholderRows />
            ) : dashboard?.dexes.items.length ? (
              <div className="iris-catalog-list-rows">
                {dashboard.dexes.items.map((dex, index) => (
                  <DefiLlamaLink
                    key={`${dex.slug || dex.name}-${index}`}
                    slug={dex.slug}
                  >
                    <AssetIcon
                      src={dex.logo || undefined}
                      symbol={String(index + 1)}
                    />
                    <span className="iris-catalog-list-identity">
                      <strong>{dex.name}</strong>
                      <small>
                        1D <Change value={dex.change1dPct} />
                      </small>
                    </span>
                    <span className="iris-catalog-list-price iris-defillama-volumes">
                      <small>24H {currency(dex.total24hUsd)}</small>
                      <small>7D {currency(dex.total7dUsd)}</small>
                    </span>
                  </DefiLlamaLink>
                ))}
              </div>
            ) : (
              <p className="iris-empty">No DEX data is available.</p>
            )}
          </section>
          <section
            className="iris-section iris-catalog-list iris-catalog-list--trending"
            aria-labelledby="iris-defillama-protocols"
          >
            <div className="iris-catalog-list-heading">
              <span aria-hidden="true" />
              <div>
                <h2 id="iris-defillama-protocols">Top protocols</h2>
                <small>
                  {pending ? (
                    <ValueSkeleton width="112px" />
                  ) : (
                    <>{count(dashboard?.protocols.total)} tracked on Solana</>
                  )}
                </small>
              </div>
            </div>
            {pending ? (
              <PlaceholderRows />
            ) : dashboard?.protocols.items.length ? (
              <div className="iris-catalog-list-rows">
                {dashboard.protocols.items.map((protocol, index) => (
                  <DefiLlamaLink
                    key={`${protocol.slug || protocol.name}-${index}`}
                    slug={protocol.slug}
                  >
                    <AssetIcon
                      src={protocol.logo || undefined}
                      symbol={String(index + 1)}
                    />
                    <span className="iris-catalog-list-identity">
                      <strong>{protocol.name}</strong>
                      <small>
                        1D <Change value={protocol.change1dPct} /> · 7D{' '}
                        <Change value={protocol.change7dPct} />
                      </small>
                    </span>
                    <span className="iris-catalog-list-price iris-defillama-tvl">
                      Solana TVL {currency(protocol.solanaTvlUsd)}
                    </span>
                  </DefiLlamaLink>
                ))}
              </div>
            ) : (
              <p className="iris-empty">No protocol data is available.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

/** Reserve dashboard row layout while metrics are loading.
 * @returns Noninteractive loading rows matching the dashboard layout.
 */
function PlaceholderRows() {
  return (
    <div className="iris-catalog-list-rows">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="iris-defillama-placeholder" key={index}>
          <ValueSkeleton className="iris-value-skeleton--icon" />
          <span>
            <ValueSkeleton width="72px" />
            <ValueSkeleton width="104px" />
          </span>
          <ValueSkeleton width="74px" />
        </div>
      ))}
    </div>
  );
}
