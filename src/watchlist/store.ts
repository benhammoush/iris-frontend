import { authenticatedRequest } from '../api/authenticated';
import { AccountSession } from '../auth/session';
import { isRecord } from '../data/record';
import { isSolanaAddress } from '../data/solana';
import {
  removedFrom,
  savedItemFrom,
  sectionFor,
  sorted,
  watchlistFrom,
  type Watchlist,
  type WatchlistKind,
} from './contract';

interface State {
  data: Watchlist | null;
  loading: boolean;
  loadError: string;
  pending: string | null;
  mutationError: string;
  feedback: string;
}
const empty = (): State => ({
  data: null,
  loading: false,
  loadError: '',
  pending: null,
  mutationError: '',
  feedback: '',
});
export const itemKey = (kind: WatchlistKind, address: string) =>
  `${kind}:${address}`;
function errorMessage(cause: unknown): string {
  const code = isRecord(cause) ? cause.code : undefined;
  if (code === 'WATCHLIST_LIMIT_REACHED')
    return 'This section holds at most 100 items. Remove one before saving another.';
  if (code === 'EMAIL_VERIFICATION_REQUIRED')
    return 'Verify your email on the Account page to use watchlists.';
  if (code === 'ACCOUNT_DELETING')
    return 'This account is being deleted. Its watchlist is unavailable.';
  if (code === 'RATE_LIMITED')
    return 'Too many requests. Wait a moment before trying again.';
  if (code === 'CONTRACT_ERROR')
    return 'The Worker returned an invalid watchlist response. Refresh to check the current list.';
  return 'Watchlist request could not be confirmed. Refresh to check the current list before trying again.';
}
function accessDenied(cause: unknown) {
  return (
    isRecord(cause) &&
    ['ACCOUNT_DELETING', 'EMAIL_VERIFICATION_REQUIRED'].includes(
      String(cause.code),
    )
  );
}

/** Private references live only in this session; no public-resource cache or storage. */
export class WatchlistStore {
  private state = empty();
  private listeners = new Set<() => void>();
  private active = 0;
  private generation = 0;
  private read?: AbortController;
  private write?: AbortController;
  constructor(private account: AccountSession) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  private allowed() {
    const state = this.account.snapshot();
    return (
      state.status === 'ready' && state.user?.verified && !state.signOutFailed
    );
  }
  connect() {
    const reset = () => {
      this.generation++;
      this.read?.abort();
      this.write?.abort();
      this.read = this.write = undefined;
      this.publish(empty());
      if (this.active) void this.refresh();
    };
    const unsubscribe = this.account.subscribe(reset);
    reset();
    const focus = () => {
      if (this.active && !document.hidden) void this.refresh();
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
      this.generation++;
      this.read?.abort();
      this.write?.abort();
    };
  }
  activate() {
    if (++this.active === 1) void this.refresh();
    return () => {
      this.active--;
    };
  }
  refresh = async () => {
    if (!this.allowed() || this.write || this.read) return;
    const generation = this.generation;
    const controller = new AbortController();
    this.read = controller;
    this.publish({ loading: true, loadError: '' });
    try {
      const result = await authenticatedRequest(
        this.account,
        '/v3/me/watchlist',
        'GET',
        { signal: controller.signal },
      );
      const data = watchlistFrom(result.data);
      if (!controller.signal.aborted && generation === this.generation)
        this.publish({ data });
    } catch (cause) {
      if (!controller.signal.aborted && generation === this.generation)
        this.publish({
          loadError: errorMessage(cause),
          ...(accessDenied(cause) ? { data: null } : {}),
        });
    } finally {
      if (this.read === controller) {
        this.read = undefined;
        this.publish({ loading: false });
      }
    }
  };
  mutate = async (kind: WatchlistKind, address: string, remove: boolean) => {
    if (
      !this.allowed() ||
      !isSolanaAddress(address) ||
      this.write ||
      !this.state.data
    )
      return;
    const identity = this.account.capture();
    const generation = this.generation;
    this.read?.abort();
    this.read = undefined;
    const controller = new AbortController();
    this.write = controller;
    let succeeded = false;
    this.publish({
      pending: itemKey(kind, address),
      loading: false,
      mutationError: '',
      feedback: '',
    });
    try {
      const result = await authenticatedRequest(
        this.account,
        `/v3/me/watchlist/${kind}/${address}`,
        remove ? 'DELETE' : 'PUT',
        { signal: controller.signal },
      );
      const saved = remove
        ? (removedFrom(result.data), null)
        : savedItemFrom(result.data, kind, address);
      if (
        controller.signal.aborted ||
        generation !== this.generation ||
        !identity.isCurrent()
      )
        return;
      const section = sectionFor(kind);
      const data = this.state.data;
      if (!data) return;
      const remaining = data[section].filter(
        (item) => item.address !== address,
      );
      const updated = sorted(saved ? [...remaining, saved] : remaining);
      this.publish({
        // Another device may have removed an item from a previously full list.
        data: updated.length <= 100 ? { ...data, [section]: updated } : null,
        feedback: remove ? 'Removed from watchlist.' : 'Saved to watchlist.',
      });
      succeeded = true;
    } catch (cause) {
      if (!controller.signal.aborted && generation === this.generation)
        this.publish({
          mutationError: errorMessage(cause),
          ...(accessDenied(cause) ? { data: null } : {}),
        });
    } finally {
      if (this.write === controller) {
        this.write = undefined;
        this.publish({ pending: null });
        if (identity.isCurrent()) await this.refresh();
      }
    }
    return succeeded && identity.isCurrent();
  };
}
