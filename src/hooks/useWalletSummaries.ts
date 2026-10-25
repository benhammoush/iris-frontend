/**
 * Account-scoped saved-wallet loading and superseded-work cancellation.
 * @packageDocumentation
 */

import { useEffect, useRef, useState } from 'react';
import { useAccount } from '../contexts/AccountContext';
import {
  loadWalletSummaries,
  type WalletSummaryResult,
} from '../watchlist/walletSummaries';

/** Load saved-wallet summaries under the current account and cancel superseded work. */
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
    const uid = session.snapshot().user?.uid;
    const unsubscribe = session.subscribe(() => {
      controller.abort();
      const state = session.snapshot();
      if (
        uid &&
        state.user?.uid === uid &&
        state.user.verified &&
        state.status === 'ready' &&
        !state.signOutFailed
      ) {
        setRequest((previous) => ({ key, revision: previous.revision + 1 }));
        return;
      }
      setResults({});
      busy.current = false;
      setLoading(false);
    });
    setResults((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([address]) => all.includes(address)),
      ),
    );
    /** Publish the new scoped state to subscribers without mutating unrelated state. */
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
  /** Refresh the currently scoped resource without accepting results from a superseded identity. */
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
    /** Refresh eligible account-scoped data when the page regains focus. */
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
