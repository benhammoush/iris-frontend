import { createContext, useContext, type ReactNode } from 'react';
import { workerApi } from '../api/worker';
import { assetsFrom } from '../data/normalizers';
import { useWorkerResource } from '../hooks/useWorkerResource';

interface CatalogState {
  assets: ReturnType<typeof assetsFrom>;
  loading: boolean;
  meta?: Record<string, unknown> | null;
  error?: unknown;
}

const CatalogContext = createContext<CatalogState>({
  assets: [],
  loading: true,
});

export function CatalogProvider({ children }: { children: ReactNode }) {
  const assets = useWorkerResource(workerApi.assets, []);
  return (
    <CatalogContext.Provider
      value={{
        assets: assetsFrom(assets.data),
        loading: assets.loading,
        meta: assets.meta,
        error: assets.error,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export const useCatalog = () => useContext(CatalogContext);
