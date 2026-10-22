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
    setResults((previous) =>
      retry
        ? Object.fromEntries(
            Object.entries(previous).filter(([address]) => address !== retry),
          )
        : {},
    );
    busy.current = targets.length > 0;
    setLoading(busy.current);
    if (targets.length)
      void loadWalletSummaries(
        session,
        targets,
        controller.signal,
        (address, result) => {
          if (!controller.signal.aborted)
            setResults((previous) => ({ ...previous, [address]: result }));
        },
      )
        .catch(() => {
          if (!controller.signal.aborted)
            setResults((previous) => ({
              ...previous,
              ...Object.fromEntries(
                targets.map((address) => [
                  address,
                  {
                    error:
                      'Wallet summary is unavailable. Refresh or sign in again.',
                  },
                ]),
              ),
            }));
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            busy.current = false;
            setLoading(false);
          }
        });
    return () => {
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
