/**
 * Asset identity and nullable price/change metrics for catalog rows.
 * @packageDocumentation
 */

import type { AssetView } from '../data/normalizers';
import AssetIcon from './AssetIcon';

/** Format a known monetary value for display and preserve the unavailable-data fallback. */
const currency = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: digits })}`;

/** Display only: callers supply already loaded catalog data, never private fetches. */
export default function CatalogAssetContent({ asset }: { asset: AssetView }) {
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

/** Render a signed percentage change with an explicit unavailable fallback. */
function Change({ value }: { value?: number | null }) {
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
