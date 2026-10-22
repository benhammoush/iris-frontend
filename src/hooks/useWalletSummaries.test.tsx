import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AccountSession } from '../auth/session';
import { alice, fakeDriver } from '../auth/testSupport';
import { walletFrom } from '../data/normalizers';
import {
  loadWalletSummaries,
  type WalletSummaryResult,
} from '../watchlist/walletSummaries';
import { useWalletSummaries } from './useWalletSummaries';

const context = vi.hoisted(() => ({ session: null as AccountSession | null }));
vi.mock('../contexts/AccountContext', () => ({
  useAccount: () => ({ session: context.session }),
}));
vi.mock('../watchlist/walletSummaries', () => ({
  loadWalletSummaries: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());
const address = 'So11111111111111111111111111111111111111112';
const other = '11111111111111111111111111111111';
function setup() {
  const session = new AccountSession(true);
  const fake = fakeDriver(alice);
  session.connect(fake.driver);
  context.session = session;
  const wallet = walletFrom({
    address,
    balances: [],
    valuation: { pricedSubtotalUsd: 25, complete: true },
  });
  if (!wallet) throw new Error('Invalid fixture');
  const data = { wallet, asOf: '2026-10-22T08:00:00.000Z', stale: false };
  vi.mocked(loadWalletSummaries).mockImplementation(
    async (_session, addresses, _signal, publish) => {
      for (const item of addresses) publish(item, { data });
    },
  );
  return { session, ...fake, data };
}
test('focus refresh retains pending values, marks failed values stale and retry restores freshness', async () => {
  const { data } = setup();
  const { result } = renderHook(() => useWalletSummaries([address, other]));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let publish: (
    address: string,
    result: WalletSummaryResult,
  ) => void = () => {};
  let finish: () => void = () => {};
  vi.mocked(loadWalletSummaries).mockImplementationOnce(
    async (_session, _addresses, _signal, callback) => {
      publish = callback;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
  );
  act(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(loadWalletSummaries).toHaveBeenCalledTimes(2);
  expect(result.current.results[address].data).toEqual(data);
  expect(result.current.loading).toBe(true);
  await act(async () => {
    publish(address, { error: 'Unavailable' });
    publish(other, { data });
    finish();
  });
  expect(result.current.results[address]).toEqual({
    data: { ...data, stale: true },
    error: 'Unavailable',
  });
  expect(result.current.results[other].data?.stale).toBe(false);
  act(() => result.current.refresh(address));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(vi.mocked(loadWalletSummaries).mock.calls[2][1]).toEqual([address]);
  expect(result.current.results[address]).toEqual({ data });
});
test.each(['sign-out', 'switch', 'unverified'] as const)(
  'clears retained summaries on %s and ignores late callbacks',
  async (mode) => {
    const { emit } = setup();
    const { result } = renderHook(() => useWalletSummaries([address]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let publish: (
      address: string,
      result: WalletSummaryResult,
    ) => void = () => {};
    let finish: () => void = () => {};
    vi.mocked(loadWalletSummaries).mockImplementationOnce(
      async (_session, _addresses, _signal, callback) => {
        publish = callback;
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
      },
    );
    act(() => result.current.refresh());
    act(() =>
      emit(
        mode === 'sign-out'
          ? null
          : {
              ...alice,
              ...(mode === 'switch' ? { uid: 'bob' } : { verified: false }),
            },
      ),
    );
    expect(result.current.results).toEqual({});
    await act(async () => {
      publish(address, { error: 'Late failure' });
      finish();
    });
    expect(result.current.results).toEqual({});
  },
);
test('removed references are discarded, even when other wallet summaries remain cached', async () => {
  setup();
  const { result, rerender } = renderHook(
    ({ addresses }) => useWalletSummaries(addresses),
    { initialProps: { addresses: [address, other] } },
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  rerender({ addresses: [other] });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.results[address]).toBeUndefined();
  expect(result.current.results[other].data).toBeDefined();
});
