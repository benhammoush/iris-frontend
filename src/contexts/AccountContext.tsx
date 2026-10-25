/**
 * React ownership and subscription boundary for the account-session lifecycle.
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
import { accountsEnabled, accountsConfigured } from '../auth/config';
import { AccountSession } from '../auth/session';

const disabled = new AccountSession(false);
const AccountContext = createContext(disabled);

/** Descendants whose account subscriptions are owned by this provider. */
interface ProviderProps {
  children: ReactNode;
}

/** Own the account-session subscription for descendant consumers.
 * @param props - Descendants sharing the owned account-session lifecycle.
 * @returns The account provider around those descendants.
 */
export function AccountProvider(props: ProviderProps) {
  const { children } = props;
  const [session] = useState(() => new AccountSession(accountsEnabled));
  useEffect(() => {
    if (!accountsEnabled) return;
    if (!accountsConfigured) {
      session.unavailable();
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void import('../auth/firebaseDriver')
      .then(({ createFirebaseDriver }) => createFirebaseDriver())
      .then((driver) => {
        if (active) unsubscribe = session.connect(driver);
      })
      .catch(() => {
        if (active) session.unavailable();
      });
    return () => {
      active = false;
      unsubscribe?.();
      session.disconnect();
    };
  }, [session]);
  return (
    <AccountContext.Provider value={session}>
      {children}
    </AccountContext.Provider>
  );
}

/** Subscribe to the provided account session, or the disabled default session outside a provider.
 * @returns Current account state and its session owner.
 */
export function useAccount() {
  const session = useContext(AccountContext);
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  return { ...state, session };
}
