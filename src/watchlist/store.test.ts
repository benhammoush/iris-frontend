import { afterEach, expect, test, vi } from 'vitest';
import { AccountSession } from '../auth/session';
import { alice, fakeDriver } from '../auth/testSupport';
import { authenticatedRequest } from '../api/authenticated';
import { WatchlistStore } from './store';
import type { Watchlist } from './contract';

vi.mock('../api/authenticated', () => ({ authenticatedRequest: vi.fn() }));
const request = vi.mocked(authenticatedRequest);
const address = 'So11111111111111111111111111111111111111112';
const savedAt = '2026-10-22T08:00:00.000Z';
const item = { address, savedAt };
const envelope = (data: unknown) => ({ data, meta: { requestId: 'test' } });
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((cleanup) => cleanup());
  vi.resetAllMocks();
});
async function setup(data: Watchlist = { assets: [], wallets: [] }) {
  request.mockResolvedValue(envelope(data));
  const account = new AccountSession(true);
  const fake = fakeDriver(alice);
  account.connect(fake.driver);
  const store = new WatchlistStore(account);
  cleanups.push(store.connect(), store.activate());
  await vi.waitFor(() => expect(store.snapshot().data).not.toBeNull());
  return { store, account, ...fake };
}
test('entry/focus refresh is deduplicated, stops when inactive and remains memory-only', async () => {
  const { store } = await setup();
  expect(request).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('focus'));
  await vi.waitFor(() => expect(store.snapshot().loading).toBe(false));
  expect(request).toHaveBeenCalledTimes(2);
  cleanups.pop()?.();
  window.dispatchEvent(new Event('focus'));
  expect(request).toHaveBeenCalledTimes(2);
  expect(localStorage.length).toBe(0);
});
test('mutation uses only fixed private routes, confirms before updating and refreshes afterward', async () => {
  const { store } = await setup();
  let finish: (
    value: Awaited<ReturnType<typeof authenticatedRequest>>,
  ) => void = () => {};
  request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  request.mockResolvedValue(envelope({ assets: [item], wallets: [] }));
  const pending = store.mutate('asset', address, false);
  expect(store.snapshot().data?.assets).toEqual([]);
  expect(store.snapshot().pending).toBe(`asset:${address}`);
  await store.mutate('wallet', address, false);
  expect(request).toHaveBeenCalledTimes(2);
  finish(envelope({ kind: 'asset', ...item }));
  expect(await pending).toBe(true);
  expect(store.snapshot().data?.assets).toEqual([item]);
  expect(request.mock.calls[1].slice(1, 3)).toEqual([
    `/v3/me/watchlist/asset/${address}`,
    'PUT',
  ]);
  expect(request.mock.calls[2].slice(1, 3)).toEqual([
    '/v3/me/watchlist',
    'GET',
  ]);
});
test('duplicate save uses its original server timestamp, remove is confirmed not optimistic', async () => {
  const { store } = await setup({ assets: [item], wallets: [] });
  request.mockResolvedValueOnce(envelope({ kind: 'asset', ...item }));
  await store.mutate('asset', address, false);
  expect(store.snapshot().data?.assets).toEqual([item]);
  request.mockResolvedValueOnce(envelope({ removed: true }));
  request.mockResolvedValue(envelope({ assets: [], wallets: [] }));
  await store.mutate('asset', address, true);
  expect(store.snapshot().data?.assets).toEqual([]);
});
test('capacity/network/contract failures never report mutation success or retry writes', async () => {
  const { store } = await setup();
  for (const code of [
    'WATCHLIST_LIMIT_REACHED',
    'RATE_LIMITED',
    'PRIVATE_REQUEST_FAILED',
  ]) {
    request.mockRejectedValueOnce({ code });
    expect(await store.mutate('asset', address, false)).toBe(false);
    expect(store.snapshot().mutationError).not.toBe('');
    expect(store.snapshot().feedback).toBe('');
    expect(store.snapshot().data?.assets).toEqual([]);
  }
  request.mockResolvedValueOnce(envelope({ kind: 'wallet', ...item }));
  await store.mutate('asset', address, false);
  expect(store.snapshot().mutationError).toContain('invalid watchlist');
  expect(request.mock.calls.filter((call) => call[2] === 'PUT')).toHaveLength(
    4,
  );
});
test('refresh failure retains the current account list with an error, never an empty-state success', async () => {
  const { store } = await setup({ assets: [item], wallets: [] });
  request.mockRejectedValueOnce(new Error('secret upstream data'));
  await store.refresh();
  expect(store.snapshot().data?.assets).toEqual([item]);
  expect(store.snapshot().loadError).not.toContain('secret');
  request.mockResolvedValueOnce(envelope({ assets: null, wallets: [] }));
  await store.refresh();
  expect(store.snapshot().loadError).toContain('invalid watchlist');
});
test.each(['read', 'write'] as const)(
  'late %s cannot publish after identity change; private state clears synchronously',
  async (mode) => {
    const { store, emit } = await setup({ assets: [item], wallets: [] });
    let finish: (
      value: Awaited<ReturnType<typeof authenticatedRequest>>,
    ) => void = () => {};
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending =
      mode === 'read' ? store.refresh() : store.mutate('asset', address, true);
    request.mockResolvedValue(envelope({ assets: [], wallets: [] }));
    emit({ ...alice, uid: 'bob' });
    expect(store.snapshot().data).toBeNull();
    expect(store.snapshot().pending).toBeNull();
    finish(
      envelope(
        mode === 'read' ? { assets: [item], wallets: [] } : { removed: true },
      ),
    );
    await pending;
    await vi.waitFor(() => expect(store.snapshot().data?.assets).toEqual([]));
    expect(store.snapshot().feedback).toBe('');
    emit(null);
    expect(store.snapshot().data).toBeNull();
  },
);
test('signed-out and unverified sessions make no private calls', async () => {
  const account = new AccountSession(true);
  const fake = fakeDriver();
  account.connect(fake.driver);
  const store = new WatchlistStore(account);
  cleanups.push(store.connect(), store.activate());
  await store.refresh();
  fake.emit({ ...alice, verified: false });
  await store.mutate('asset', address, false);
  expect(request).not.toHaveBeenCalled();
});

test('server verification/deletion denials clear previously loaded references', async () => {
  const { store } = await setup({ assets: [item], wallets: [] });
  request.mockRejectedValueOnce({ code: 'ACCOUNT_DELETING' });
  await store.refresh();
  expect(store.snapshot().data).toBeNull();
  expect(store.snapshot().loadError).toContain('being deleted');
  request.mockResolvedValueOnce(envelope({ assets: [item], wallets: [] }));
  await store.refresh();
  request.mockRejectedValue({ code: 'EMAIL_VERIFICATION_REQUIRED' });
  await store.mutate('asset', address, true);
  expect(store.snapshot().data).toBeNull();
  expect(store.snapshot().mutationError).toContain('Verify your email');
});
