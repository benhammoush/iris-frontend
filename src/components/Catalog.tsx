/**
 * Discovery catalog route with independent loading and failure feedback.
 * @packageDocumentation
 */

import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCatalog } from '../contexts/CatalogContext';
import Navbar from './Navbar';
import AssetIcon from './AssetIcon';
import { looksLikeSolanaAddress } from '../data/solana';
import { ValueSkeleton } from '../design-system';
import ResourceFeedback from './ResourceFeedback';

/** Public discovery surface selected by the route. */
interface CatalogProps {
  kind: 'assets' | 'wallets';
}

/** Render the requested discovery catalog without mixing catalog identities.
 * @param props - Asset-catalog or public-wallet-lookup route selection.
 * @returns The selected discovery surface with independent loading and failure feedback.
 */
export default function Catalog(props: CatalogProps) {
  const { kind } = props;
  const { assets, loading, refreshing, error, refetch } = useCatalog();
  const [address, setAddress] = useState('');
  const navigate = useNavigate();
  const showingAssets = kind === 'assets';
  const trimmedAddress = address.trim();
  const validAddress = looksLikeSolanaAddress(trimmedAddress);

  return (
    <div className="iris-shell">
      <Navbar />
      <main id="iris-main" tabIndex={-1} className="iris-page">
        <section className="iris-page-heading">
          <div>
            <p className="iris-eyebrow">Solana explorer</p>
            <h1>{showingAssets ? 'Asset catalog' : 'Public wallet lookup'}</h1>
            <p>
              {showingAssets
                ? 'Assets available through the public Iris Worker catalog.'
                : 'Paste any public Solana address to view its current portfolio and activity.'}
            </p>
          </div>
          {showingAssets && (
            <span className="iris-block">{assets.length} tracked</span>
          )}
        </section>
        {showingAssets && (
          <ResourceFeedback
            label="Catalog data"
            error={error}
            busy={loading || refreshing}
            hasData={assets.length > 0}
            errorMessage="Catalog data is currently unavailable."
            onRetry={refetch}
            retryLabel="Retry catalog"
          />
        )}
        {showingAssets ? (
          loading ? (
            <section
              className="iris-catalog-grid"
              aria-label="Loading catalog"
              aria-busy="true"
            >
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  className="iris-catalog-card iris-catalog-card--placeholder"
                  key={index}
                >
                  <ValueSkeleton className="iris-value-skeleton--icon" />
                  <div>
                    <ValueSkeleton width="54px" />
                    <ValueSkeleton width="112px" />
                  </div>
                  <ValueSkeleton width="60px" />
                </div>
              ))}
            </section>
          ) : error && !assets.length ? null : !assets.length ? (
            <p className="iris-empty">No assets are available.</p>
          ) : (
            <section className="iris-catalog-grid">
              {assets.map((asset) => (
                <Link
                  key={asset.mint}
                  className="iris-catalog-card"
                  to={`/asset/${encodeURIComponent(asset.mint)}`}
                >
                  <AssetIcon src={asset.imageUrl} symbol={asset.symbol} />
                  <div>
                    <strong>{asset.symbol}</strong>
                    <small>{asset.name}</small>
                  </div>
                  <span>
                    {asset.priceUsd === null || asset.priceUsd === undefined
                      ? 'Price unavailable'
                      : `$${Number(asset.priceUsd).toLocaleString('en-US', { maximumFractionDigits: 5 })}`}
                  </span>
                </Link>
              ))}
            </section>
          )
        ) : (
          <section className="iris-section">
            <div className="iris-search">
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Solana wallet address"
                aria-label="Solana wallet address"
              />
              <button
                className="iris-retry"
                disabled={!validAddress}
                onClick={() =>
                  void navigate(`/wallet/${encodeURIComponent(trimmedAddress)}`)
                }
              >
                View wallet
              </button>
            </div>
            {address && !validAddress && (
              <p className="iris-empty">Enter a valid Base58 Solana address.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
