import { createContext, useContext, type ReactNode } from 'react';
import { workerApi } from '../api/worker';
import { networkFrom, recentTransactionsFrom } from '../data/normalizers';
import { useWorkerResource } from '../hooks/useWorkerResource';
import { isRecord } from '../data/record';

interface HeliusDashboardState {
  network: ReturnType<typeof networkFrom>;
  transactions: ReturnType<typeof recentTransactionsFrom>;
  loading: boolean;
  error: unknown;
  meta: Record<string, unknown> | null;
}

const HeliusDashboardContext = createContext<HeliusDashboardState>({
  network: null,
  transactions: [],
  loading: true,
  error: null,
  meta: null,
});

export function HeliusDashboardProvider({ children }: { children: ReactNode }) {
  const dashboard = useWorkerResource(workerApi.recentTransactions, [], 60_000);
  return (
    <HeliusDashboardContext.Provider
      value={{
        network: networkFrom(
          isRecord(dashboard.data) ? dashboard.data.network : null,
        ),
        transactions: recentTransactionsFrom(dashboard.data),
        loading: dashboard.loading,
        error: dashboard.error,
        meta: dashboard.meta,
      }}
    >
      {children}
    </HeliusDashboardContext.Provider>
  );
}

export const useHeliusDashboard = () => useContext(HeliusDashboardContext);
