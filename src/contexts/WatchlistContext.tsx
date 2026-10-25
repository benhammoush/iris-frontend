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

/** Descendants whose private watchlist state shares one account-scoped owner. */
interface ProviderProps {
  children: ReactNode;
}

/** Own the account-scoped watchlist subscription and its cleanup.
 * @param props - Descendants sharing the current account's watchlist owner.
 * @returns The watchlist provider around those descendants.
 */
export function WatchlistProvider(props: ProviderProps) {
  const { children } = props;
  const { session } = useAccount();
  const [store] = useState(() => new WatchlistStore(session));
  useEffect(() => store.connect(), [store]);
  return (
    <WatchlistContext.Provider value={store}>
      {children}
    </WatchlistContext.Provider>
  );
}
/** Read watchlist state and reject use outside its provider.
 * @returns Current private watchlist state and account-scoped refresh/mutation actions.
 */
export function useWatchlist() {
  const store = useContext(WatchlistContext);
  if (!store) throw new Error('WatchlistProvider is required.');
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  useEffect(() => store.activate(), [store]);
  return { ...state, refresh: store.refresh, mutate: store.mutate };
}
