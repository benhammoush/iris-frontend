import { useEffect, useRef, useState } from 'react';
import { useAccount } from '../contexts/AccountContext';
import {
  loadWalletSummaries,
  type WalletSummaryResult,
} from '../watchlist/walletSummaries';

export function useWalletSummaries(addresses: string[]) {
  const { session } = useAccount();
  const key = addresses.join(',');
  const [request, setRequest] = useState<{
    key: string;
    address?: string;
    revision: number;
  }>({ key: '', revision: 0 });
  const [results, setResults] = useState<Record<string, WalletSummaryResult>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    const all = key ? key.split(',') : [];
    const retry =
      request.key === key && request.address && all.includes(request.address)
        ? request.address
        : undefined;
    const targets = retry ? [retry] : all;
    const unsubscribe = session.subscribe(() => {
      controller.abort();
      setResults({});
      busy.current = false;
      setLoading(false);
    });
    setResults((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([address]) => all.includes(address)),
      ),
    );
    const publish = (address: string, result: WalletSummaryResult) => {
      if (controller.signal.aborted) return;
      setResults((previous) => {
        const data = previous[address]?.data;
        return {
          ...previous,
          [address]:
            result.error && data
              ? { data: { ...data, stale: true }, error: result.error }
              : result,
        };
      });
    };
    busy.current = targets.length > 0;
    setLoading(busy.current);
    if (targets.length)
      void loadWalletSummaries(session, targets, controller.signal, publish)
        .catch(() => {
          for (const address of targets)
            publish(address, {
              error: 'Wallet summary is unavailable. Refresh or sign in again.',
            });
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            busy.current = false;
            setLoading(false);
          }
        });
    return () => {
      unsubscribe();
      controller.abort();
      busy.current = false;
    };
  }, [session, key, request]);
  const refresh = (address?: string) => {
    if (busy.current) return;
    busy.current = true;
    setRequest((previous) => ({
      key,
      address,
      revision: previous.revision + 1,
    }));
  };
  useEffect(() => {
    const focus = () => {
      if (!document.hidden && !busy.current) {
        busy.current = true;
        setRequest((previous) => ({ key, revision: previous.revision + 1 }));
      }
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [key]);
  return { results, loading, refresh };
}
