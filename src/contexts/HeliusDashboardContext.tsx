/**
 * Shared network dashboard loading, refresh and failure state for React consumers.
 * @packageDocumentation
 */

import { createContext, useContext, type ReactNode } from 'react';
import { workerApi } from '../api/worker';
import { networkFrom, recentTransactionsFrom } from '../data/normalizers';
import { useWorkerResource } from '../hooks/useWorkerResource';
import { isRecord } from '../data/record';

/** Shared network dashboard data and independent resource feedback. */
interface HeliusDashboardState {
  network: ReturnType<typeof networkFrom>;
  transactions: ReturnType<typeof recentTransactionsFrom>;
  loading: boolean;
  error: unknown;
  meta: Record<string, unknown> | null;
  refreshing?: boolean;
  /** Request a fresh load from the resource owner. */
  refetch?: () => void;
}

const HeliusDashboardContext = createContext<HeliusDashboardState>({
  network: null,
  transactions: [],
  loading: true,
  error: null,
  meta: null,
});

/** Descendants sharing network-dashboard resources. */
interface ProviderProps {
  children: ReactNode;
}

/** Own shared dashboard data and refresh state for descendant consumers.
 * @param props - Descendants sharing dashboard resource state.
 * @returns The dashboard provider around those descendants.
 */
export function HeliusDashboardProvider(props: ProviderProps) {
  const { children } = props;
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
        refreshing: dashboard.refreshing,
        refetch: dashboard.refetch,
      }}
    >
      {children}
    </HeliusDashboardContext.Provider>
  );
}

/** Read dashboard state; outside a provider the default has no data and remains loading.
 * @returns Network metrics, transaction samples and their resource feedback.
 */
export const useHeliusDashboard = () => useContext(HeliusDashboardContext);
