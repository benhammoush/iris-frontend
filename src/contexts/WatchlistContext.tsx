/**
 * React ownership and subscription boundary for the account-scoped watchlist store.
 * @packageDocumentation
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useAccount } from './AccountContext';
import { WatchlistStore } from '../watchlist/store';

const WatchlistContext = createContext<WatchlistStore | null>(null);
/** Own the account-scoped watchlist subscription and its cleanup. */
export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { session } = useAccount();
  const [store] = useState(() => new WatchlistStore(session));
  useEffect(() => store.connect(), [store]);
  return (
    <WatchlistContext.Provider value={store}>
      {children}
    </WatchlistContext.Provider>
  );
}
/** Read watchlist state and reject use outside its provider. */
export function useWatchlist() {
  const store = useContext(WatchlistContext);
  if (!store) throw new Error('WatchlistProvider is required.');
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  useEffect(() => store.activate(), [store]);
  return { ...state, refresh: store.refresh, mutate: store.mutate };
}
