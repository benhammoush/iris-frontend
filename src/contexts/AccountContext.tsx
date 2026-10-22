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

export function AccountProvider({ children }: { children: ReactNode }) {
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

export function useAccount() {
  const session = useContext(AccountContext);
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  return { ...state, session };
}
