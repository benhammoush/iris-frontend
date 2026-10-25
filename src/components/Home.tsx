/**
 * Market overview with provider context and bounded discovery previews.
 * @packageDocumentation
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { workerApi } from '../api/worker';
import { assetsFrom, defillamaFrom } from '../data/normalizers';
import { useWorkerResource } from '../hooks/useWorkerResource';
import { useCatalog } from '../contexts/CatalogContext';
import DataStatus from './DataStatus';
import CatalogAssetContent from './CatalogAssetContent';
import CatalogPanel from './CatalogPanel';
import Navbar from './Navbar';
import HeliusNetworkCard from './HeliusNetworkCard';
import DefiLlamaCard from './DefiLlamaCard';
import { ValueSkeleton } from '../design-system';
import { useHeliusDashboard } from '../contexts/HeliusDashboardContext';
import { isRecord } from '../data/record';
import ResourceFeedback from './ResourceFeedback';

/** Asset identity and metrics consumed by catalog previews. */
type Asset = ReturnType<typeof assetsFrom>[number];
const SOL_MINT = 'So11111111111111111111111111111111111111112';

/** Render the market overview and its discovery resources.
 * @returns Discovery resources with independent loading and failure feedback.
 */
export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedMint = searchParams.get('mint') || SOL_MINT;
  const {
    assets,
    loading: catalogLoading,
    meta: catalogMeta,
    error: catalogError,
    refreshing: catalogRefreshing,
    refetch: retryCatalog,
  } = useCatalog();
  const selectedResult = useWorkerResource(
    (options) => workerApi.asset(selectedMint, options),
    [selectedMint],
  );
  const catalogsResult = useWorkerResource(workerApi.catalogs, []);
  const heliusDashboard = useHeliusDashboard();
  const defillamaDashboardResult = useWorkerResource(workerApi.defillama, []);
  const catalogAssets = assets;
  const catalogs = isRecord(catalogsResult.data) ? catalogsResult.data : {};
  const defillama = defillamaDashboardResult.data
    ? defillamaFrom(defillamaDashboardResult.data)
    : null;

  return (
    <div className="iris-shell">
      <Navbar />
      <DataStatus
        meta={selectedResult.meta || catalogsResult.meta || catalogMeta}
        error={selectedResult.error || catalogsResult.error || catalogError}
      />
      <main id="iris-main" tabIndex={-1} className="iris-page">
        <section className="iris-page-heading">
          <div>
            <p className="iris-eyebrow">Market monitor</p>
            <h1>Market overview</h1>
            <p>
              Live Solana network data and market discovery from the Iris
              Worker.
            </p>
          </div>
        </section>
        <ResourceFeedback
          label="Market discovery"
          error={selectedResult.error || catalogsResult.error || catalogError}
          busy={
            selectedResult.loading ||
            selectedResult.refreshing ||
            catalogsResult.loading ||
            catalogsResult.refreshing ||
            catalogLoading ||
            catalogRefreshing
          }
          hasData={assets.length > 0 || catalogsResult.data !== null}
          retryLabel="Retry market data"
          onRetry={() => {
            selectedResult.refetch();
            catalogsResult.refetch();
            retryCatalog?.();
          }}
        />
        <HeliusNetworkCard
          network={heliusDashboard.network}
          loading={heliusDashboard.loading}
          error={heliusDashboard.error}
          transactions={heliusDashboard.transactions}
          transactionsLoading={heliusDashboard.loading}
          transactionsError={heliusDashboard.error}
          refreshing={heliusDashboard.refreshing}
          onRetry={heliusDashboard.refetch}
        />
        <DefiLlamaCard
          dashboard={defillama}
          loading={defillamaDashboardResult.loading}
          error={defillamaDashboardResult.error}
          refreshing={defillamaDashboardResult.refreshing}
          onRetry={defillamaDashboardResult.refetch}
        />
        <section
          className="iris-section iris-jupiter-dex"
          aria-label="Jupiter discovery catalogs"
        >
          <div className="iris-jupiter-dex-label">
            <JupiterLogo />
            <div>
              <p>Jupiter</p>
            </div>
            <span className="iris-jupiter-badge">Decentralised Exchange</span>
          </div>
          <div className="iris-catalog-lists">
            <CatalogList
              title="Top Volume"
              tone="volume"
              assets={assetsFrom(catalogs.topTraded || catalogAssets)}
              loading={catalogsResult.loading || catalogLoading}
              error={!assets.length && (catalogsResult.error || catalogError)}
              onSelect={(asset) =>
                void navigate(`/asset/${encodeURIComponent(asset.mint)}`)
              }
            />
            <CatalogList
              title="Trending"
              tone="trending"
              assets={assetsFrom(catalogs.trending)}
              loading={catalogsResult.loading}
              error={catalogsResult.error}
              onSelect={(asset) =>
                void navigate(`/asset/${encodeURIComponent(asset.mint)}`)
              }
            />
            <CatalogList
              title="New tokens"
              tone="pools"
              assets={assetsFrom(catalogs.recent)}
              loading={catalogsResult.loading}
              error={catalogsResult.error}
              onSelect={(asset) =>
                void navigate(`/asset/${encodeURIComponent(asset.mint)}`)
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
}

/** Render the provider identity artwork used by the market overview.
 * @returns Decorative provider artwork hidden from assistive technology.
 */
export function JupiterLogo() {
  return (
    <span className="iris-jupiter-mark" aria-hidden="true">
      <svg
        width="33"
        height="32"
        viewBox="0 0 33 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#iris-jupiter-logo-clip)">
          <g filter="url(#iris-jupiter-logo-filter)">
            <path
              d="M3.09074 25.1666C4.44267 27.0471 6.17683 28.6205 8.1795 29.7838C10.1822 30.947 12.4081 31.6738 14.7114 31.9165C13.5264 30.1333 11.8039 28.4928 9.65354 27.2438C7.50318 25.9948 5.22592 25.3125 3.09074 25.1666Z"
              fill="url(#iris-jupiter-logo-gradient)"
            />
            <path
              d="M12.543 22.2705C8.40015 19.8636 3.91612 19.2502 0.707663 20.3338C1.0174 21.3575 1.42589 22.3487 1.92738 23.2934C4.71498 23.2288 7.75856 23.9859 10.5906 25.6308C13.4227 27.2757 15.5888 29.5459 16.9143 32C17.9839 31.9672 19.0479 31.8309 20.0913 31.5932C19.4426 28.2698 16.6849 24.6779 12.543 22.2705Z"
              fill="url(#iris-jupiter-logo-gradient)"
            />
            <path
              d="M32.2852 12.5009C31.7585 10.3584 30.8054 8.34403 29.4829 6.57804C28.1604 4.81205 26.4956 3.33067 24.5879 2.22235C22.6802 1.11403 20.5687 0.401504 18.3796 0.127309C16.1904 -0.146885 13.9684 0.0228794 11.8463 0.626465C15.3915 1.06033 19.3267 2.39122 23.1859 4.63324C27.0452 6.87525 30.1533 9.63411 32.2852 12.5009Z"
              fill="url(#iris-jupiter-logo-gradient)"
            />
            <path
              d="M27.1271 20.3583C25.3124 17.3446 22.2038 14.4588 18.3743 12.2342C14.5449 10.0095 10.4991 8.7388 6.98531 8.65474C3.894 8.58152 1.57389 9.48017 0.621548 11.1197C0.616125 11.1294 0.608532 11.1386 0.602566 11.1484C0.516877 11.4559 0.44312 11.7639 0.37587 12.0731C1.70568 11.5481 3.24645 11.2558 4.95969 11.2232C8.76959 11.1517 13.0334 12.3703 16.9681 14.6562C20.9027 16.9422 24.0759 20.0438 25.9003 23.3878C26.7182 24.8944 27.2285 26.3777 27.4308 27.7948C27.6662 27.5844 27.8972 27.3669 28.1212 27.1408C28.1272 27.1305 28.131 27.1196 28.1369 27.1088C29.0893 25.4677 28.721 23.0076 27.1271 20.3583Z"
              fill="url(#iris-jupiter-logo-gradient)"
            />
            <path
              d="M15.4609 17.2485C9.59662 13.8416 3.11626 13.3079 0 15.6855C0.00612096 16.4297 0.0630166 17.1726 0.170292 17.9091C1.08699 17.6312 2.03177 17.4562 2.98718 17.3874C6.46952 17.1254 10.3087 18.0957 13.7927 20.1207C17.2766 22.1458 20.023 25.0018 21.5209 28.1543C21.935 29.018 22.2508 29.9254 22.4624 30.8595C23.1555 30.5878 23.8294 30.2694 24.4794 29.9066C25.0011 26.0213 21.3268 20.656 15.4609 17.2485Z"
              fill="url(#iris-jupiter-logo-gradient)"
            />
            <path
              d="M30.1434 15.3141C28.3082 12.3036 25.1724 9.40969 21.3158 7.17039C17.4593 4.93109 13.3977 3.64033 9.87257 3.53674C7.1853 3.45919 5.10382 4.11053 4.02457 5.34109C8.50588 4.58182 14.4168 5.85794 20.146 9.18625C25.8753 12.5146 29.9135 17.0181 31.4722 21.2868C32.0064 19.7406 31.5416 17.6098 30.1434 15.3141Z"
              fill="url(#iris-jupiter-logo-gradient)"
            />
          </g>
        </g>
        <defs>
          <filter
            id="iris-jupiter-logo-filter"
            x="-22.7449"
            y="-20.4704"
            width="77.7749"
            height="77.4898"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="2.27449" />
            <feGaussianBlur stdDeviation="11.3724" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow"
              result="shape"
            />
          </filter>
          <linearGradient
            id="iris-jupiter-logo-gradient"
            x1="21.5"
            y1="6.5"
            x2="6.66667"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.0001" stopColor="#C7F284" />
            <stop offset="1" stopColor="#00BEF0" />
          </linearGradient>
          <clipPath id="iris-jupiter-logo-clip">
            <rect width="32.2852" height="32" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </span>
  );
}

/** Bounded catalog-preview content and user-selected asset action. */
interface CatalogListProps {
  title: string;
  tone: 'volume' | 'trending' | 'pools';
  assets: Asset[];
  loading: boolean;
  error?: unknown;
  /** Notify the owner of the selected asset without owning navigation state.
   * @param asset - Exact catalog item activated by the user.
   */
  onSelect: (asset: Asset) => void;
}

/** Render a bounded catalog preview and its loading or failure feedback.
 * @param props - Catalog title, tone, items and independent resource feedback.
 * @returns Preview rows with explicit loading, empty or failure states.
 */
function CatalogList(props: CatalogListProps) {
  const { title, tone, assets, loading, error, onSelect } = props;
  return (
    <CatalogPanel title={title} tone={tone}>
      {loading && !assets.length ? (
        <div className="iris-catalog-list-rows" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <button
              key={index}
              disabled
              className="iris-catalog-list-placeholder"
            >
              <ValueSkeleton className="iris-value-skeleton--icon" />
              <span className="iris-catalog-list-identity">
                <ValueSkeleton width="48%" />
                <ValueSkeleton width="70%" />
                <ValueSkeleton width="58%" />
              </span>
              <span className="iris-catalog-list-price">
                <ValueSkeleton width="64px" />
                <ValueSkeleton width="42px" />
              </span>
            </button>
          ))}
        </div>
      ) : assets.length ? (
        <div className="iris-catalog-list-rows">
          {assets.map((asset) => (
            <button key={asset.mint} onClick={() => onSelect(asset)}>
              <CatalogAssetContent asset={asset} />
            </button>
          ))}
        </div>
      ) : (
        <p className="iris-empty">
          {error
            ? 'Asset discovery is unavailable.'
            : 'No assets are available.'}
        </p>
      )}
    </CatalogPanel>
  );
}
