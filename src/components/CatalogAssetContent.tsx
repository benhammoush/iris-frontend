/**
 * Asset identity and nullable price/change metrics for catalog rows.
 * @packageDocumentation
 */

import type { AssetView } from '../data/normalizers';
import AssetIcon from './AssetIcon';

/** Format a known monetary value for display and preserve the unavailable-data fallback.
 * @param value - Available USD metric, or an unavailable value.
 * @param digits - Maximum displayed fractional digits.
 * @returns Formatted currency text or the unavailable placeholder.
 */
const currency = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: digits })}`;

/** Already-normalized asset displayed in a catalog row. */
interface CatalogAssetProps {
  asset: AssetView;
}

/** Display only: callers supply already loaded catalog data, never private fetches.
 * @param props - Normalized asset identity and nullable display metrics.
 * @returns Catalog-row identity, price and change content without fetching data.
 */
export default function CatalogAssetContent(props: CatalogAssetProps) {
  const { asset } = props;
  return (
    <>
      <AssetIcon src={asset.imageUrl} symbol={asset.symbol} />
      <span className="iris-catalog-list-identity">
        <strong>{asset.symbol}</strong>
        <small>{asset.name}</small>
        <small>Volume {currency(asset.activity?.volume24hUsd)}</small>
        {asset.verification?.isVerified === false && <em>Unverified</em>}
      </span>
      <span className="iris-catalog-list-price">
        {currency(asset.priceUsd, 5)}
        <Change value={asset.change24hPct} />
      </span>
    </>
  );
}

/** Optional percentage-change display value. */
interface ChangeProps {
  value?: number | null;
}

/** Render a signed percentage change with an explicit unavailable fallback.
 * @param props - Optional percentage-change metric.
 * @returns Signed display text or an unavailable placeholder.
 */
function Change(props: ChangeProps) {
  const { value } = props;
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return <span className="iris-muted">—</span>;
  const change = Number(value);
  return (
    <span className={change >= 0 ? 'iris-positive' : 'iris-negative'}>
      {change >= 0 ? '+' : ''}
      {change.toFixed(2)}%
    </span>
  );
}
