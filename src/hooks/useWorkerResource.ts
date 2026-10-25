/**
 * Cancellable resource lifecycle, retained data and visibility-aware polling.
 * @packageDocumentation
 */

import { type DependencyList, useEffect, useState } from 'react';

/** Successful resource payload and metadata, optionally accompanied by a partial-data error. */
export interface ResourceResult<T, M> {
  data: T;
  meta: M;
  error?: unknown;
}

/** Resource lifecycle with retained data and distinct initial-load versus refresh flags. */
export interface ResourceState<T, M> {
  loading: boolean;
  refreshing: boolean;
  data: T | null;
  meta: M | null;
  error: unknown;
}

/** Cancellable resource operation supplied by the caller. */
export type ResourceLoader<T, M> = (options: {
  signal: AbortSignal;
}) => Promise<ResourceResult<T, M>>;

/**
 * Own a cancellable resource load with retained data during refresh and failure.
 *
 * @param load - Loader receiving an owned abort signal; dependencies must describe its captured inputs.
 * @param dependencies - Caller-owned reload identity. Changing only the loader function identity does not reload.
 * @param pollIntervalMs - Visible-page refresh interval in milliseconds; zero disables polling.
 * @returns Current data, metadata and failure state, separate initial/refresh flags, and an explicit refetch action.
 *
 * @remarks
 * Cleanup aborts superseded work and prevents its result from publishing. Existing data
 * survives refresh failures and remains visible while a changed dependency is loading.
 */
export function useWorkerResource<T, M>(
  load: ResourceLoader<T, M>,
  dependencies: DependencyList = [],
  pollIntervalMs = 0,
) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<ResourceState<T, M>>({
    loading: true,
    refreshing: false,
    data: null,
    meta: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({
      ...current,
      loading: current.data === null,
      refreshing: current.data !== null,
      error: null,
    }));
    load({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setState({
            loading: false,
            refreshing: false,
            data: result.data,
            meta: result.meta,
            error: result.error || null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState((current) => ({
            ...current,
            loading: false,
            refreshing: false,
            error,
          }));
      });
    return () => controller.abort();
    // Callers define dependencies for their stable resource loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reload]);

  useEffect(() => {
    if (!pollIntervalMs) return undefined;
    let interval: ReturnType<typeof setInterval> | null = null;
    /** Start one refresh timer only while the document is visible. */
    const startPolling = () => {
      if (!document.hidden && interval === null)
        interval = setInterval(
          () => setReload((value) => value + 1),
          pollIntervalMs,
        );
    };
    /** Clear the owned refresh timer without leaving background polling active. */
    const stopPolling = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };
    /** Pause hidden-page polling and request fresh data when the page becomes visible. */
    const onVisibilityChange = () => {
      if (document.hidden) stopPolling();
      else {
        startPolling();
        setReload((value) => value + 1);
      }
    };
    startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pollIntervalMs]);

  return {
    ...state,
    /** Request a fresh load from the resource owner. */
    refetch: () => {
      setReload((value) => value + 1);
    },
  };
}
