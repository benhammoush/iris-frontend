import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { looksLikeSolanaAddress } from '../data/solana';

interface SearchAsset {
  mint: string;
  symbol?: string | null;
  name?: string | null;
  priceUsd?: number | null;
}

interface SearchAction {
  id: string;
  label: string;
  path: string;
  meta: string;
}

function matchRank(asset: SearchAsset, query: string, normalized: string) {
  const symbol = asset.symbol?.toUpperCase() || '';
  const name = asset.name?.toUpperCase() || '';
  const mint = asset.mint || '';

  if (mint === query || symbol === normalized || name === normalized) return 0;
  if (
    mint.startsWith(query) ||
    symbol.startsWith(normalized) ||
    name.startsWith(normalized)
  )
    return 1;
  return 2;
}

export function searchAssets<T extends SearchAsset>(
  assets: T[],
  query: string,
): T[] {
  const value = query.trim();
  if (!value) return [];
  const normalized = value.toUpperCase();

  return assets
    .map((asset, index) => ({ asset, index }))
    .filter(
      ({ asset }) =>
        asset.mint?.includes(value) ||
        [asset.symbol, asset.name].some((field) =>
          field?.toUpperCase().includes(normalized),
        ),
    )
    .sort(
      (left, right) =>
        matchRank(left.asset, value, normalized) -
          matchRank(right.asset, value, normalized) || left.index - right.index,
    )
    .slice(0, 5)
    .map(({ asset }) => asset);
}

function formatPrice(value: unknown) {
  return value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
    ? 'Price unavailable'
    : `$${Number(value).toFixed(5)}`;
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export default function NavbarSearch({
  assets,
  loading,
  error,
  navigate,
  mobileOpen,
  setMobileOpen,
}: {
  assets: SearchAsset[];
  loading: boolean;
  error?: unknown;
  navigate: (path: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const queryValue = deferredQuery.trim();
  const assetMatches = useMemo(
    () => searchAssets(assets, queryValue),
    [assets, queryValue],
  );
  const publicAddress = looksLikeSolanaAddress(queryValue) ? queryValue : null;
  const hasExactAsset = assetMatches.some(
    (asset) => asset.mint === publicAddress,
  );
  const actions = [
    ...assetMatches.map((asset) => ({
      id: `asset-${asset.mint}`,
      label: `${asset.symbol} ${asset.name || ''} ${formatPrice(asset.priceUsd)}`,
      path: `/asset/${encodeURIComponent(asset.mint)}`,
      meta: asset.mint,
    })),
    ...(publicAddress && !hasExactAsset
      ? [
          {
            id: `mint-${publicAddress}`,
            label: `View token mint ${shortAddress(publicAddress)}`,
            path: `/asset/${encodeURIComponent(publicAddress)}`,
            meta: 'Look up this address as a token mint',
          },
        ]
      : []),
    ...(publicAddress
      ? [
          {
            id: `wallet-${publicAddress}`,
            label: `View public wallet ${shortAddress(publicAddress)}`,
            path: `/wallet/${encodeURIComponent(publicAddress)}`,
            meta: 'Look up this address as a public wallet',
          },
        ]
      : []),
  ];
  const visible = open && Boolean(query.trim());
  const status =
    loading && !assets.length
      ? 'Loading assets...'
      : error && !assets.length
        ? 'Asset search is unavailable. You can still open a public address.'
        : !actions.length
          ? 'No matching loaded assets.'
          : `${actions.length} ${actions.length === 1 ? 'result' : 'results'} available.`;

  useEffect(() => {
    setActiveIndex(-1);
  }, [queryValue]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    inputRef.current?.focus();
    return undefined;
  }, [mobileOpen]);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (
        !(event.target instanceof Node) ||
        !searchRef.current?.contains(event.target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
        setMobileOpen(false);
      }
    }

    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [setMobileOpen]);

  function select(action: SearchAction) {
    navigate(action.path);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    setMobileOpen(false);
  }

  function closeMobileSearch() {
    setMobileOpen(false);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, actions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Home' && actions.length) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && actions.length) {
      event.preventDefault();
      setActiveIndex(actions.length - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      select(actions[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      setMobileOpen(false);
    }
  }

  return (
    <div
      ref={searchRef}
      className="iris-search"
      data-mobile-open={mobileOpen || undefined}
    >
      <div className="iris-search-input-wrap">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search assets or paste a wallet address"
          aria-label="Search assets or paste a wallet address"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0
              ? `${listboxId}-${actions[activeIndex]?.id}`
              : undefined
          }
        />
        <button
          className="iris-search-close"
          type="button"
          onClick={closeMobileSearch}
          aria-label="Close search"
        >
          Close
        </button>
      </div>
      <span className="iris-search-status" role="status" aria-live="polite">
        {visible ? status : ''}
      </span>
      {visible && (
        <ul
          id={listboxId}
          className="iris-results"
          role="listbox"
          aria-label="Search results"
        >
          {actions.map((action, index) => (
            <li key={action.id}>
              <button
                id={`${listboxId}-${action.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? 'active' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(action)}
              >
                <span>{action.label}</span>
                <small>{action.meta}</small>
              </button>
            </li>
          ))}
          {!actions.length && <li className="iris-search-message">{status}</li>}
        </ul>
      )}
    </div>
  );
}
