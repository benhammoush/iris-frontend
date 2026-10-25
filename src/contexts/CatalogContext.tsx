/**
 * Shared discovery catalogs and resource state for React consumers.
 * @packageDocumentation
 */

import { createContext, useContext, type ReactNode } from 'react';
import { workerApi } from '../api/worker';
import { assetsFrom } from '../data/normalizers';
import { useWorkerResource } from '../hooks/useWorkerResource';

/** Shared catalog data and its load, refresh and failure state. */
interface CatalogState {
  assets: ReturnType<typeof assetsFrom>;
  loading: boolean;
  meta?: Record<string, unknown> | null;
  error?: unknown;
  refreshing?: boolean;
  /** Request a fresh load from the resource owner. */
  refetch?: () => void;
}

const CatalogContext = createContext<CatalogState>({
  assets: [],
  loading: true,
});

/** Descendants sharing a catalog resource owner. */
interface ProviderProps {
  children: ReactNode;
}

/** Own shared catalog resources for descendant consumers.
 * @param props - Descendants sharing catalog loading, data and refresh state.
 * @returns The catalog provider around those descendants.
 */
export function CatalogProvider(props: ProviderProps) {
  const { children } = props;
  const assets = useWorkerResource(workerApi.assets, []);
  return (
    <CatalogContext.Provider
      value={{
        assets: assetsFrom(assets.data),
        loading: assets.loading,
        meta: assets.meta,
        error: assets.error,
        refreshing: assets.refreshing,
        refetch: assets.refetch,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

/** Read catalog state; outside a provider the default is an empty, loading catalog.
 * @returns Normalized asset data and its independent resource feedback.
 */
export const useCatalog = () => useContext(CatalogContext);
