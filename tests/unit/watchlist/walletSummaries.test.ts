/**
 * Regression coverage and controlled fixtures for wallet summaries.
 * @packageDocumentation
 */

import { expect, test, vi, afterEach } from 'vitest';
import { workerApi } from '../../../src/api/worker';
import { AccountSession } from '../../../src/auth/session';
import { alice, fakeDriver } from '../auth/testSupport';
import { loadWalletSummaries } from '../../../src/watchlist/walletSummaries';

vi.mock('../../../src/api/worker', () => ({ workerApi: { wallet: vi.fn() } }));
const request = vi.mocked(workerApi.wallet);
afterEach(() => vi.resetAllMocks());
const addresses = Array.from(
  { length: 9 },
  (_, index) => '1'.repeat(31) + '23456789A'[index],
);
/** Build the controlled wallet JSON envelope containing data and response metadata. */
const response = (address: string) => ({
  data: {
    address,
    balances: [
      {
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        amount: '9007199254740993.123456789',
        valueUsd: null,
      },
    ],
    valuation: { pricedSubtotalUsd: null, complete: false },
  },
  meta: {
    requestId: 'test',
    wallet: {
      source: 'helius-das',
      asOf: '2026-10-22T08:00:00.000Z',
      cacheState: 'fresh',
    },
  },
});
/** Create isolated dependencies and controlled session state for this test. */
function setup() {
  const session = new AccountSession(true);
  const fake = fakeDriver(alice);
  session.connect(fake.driver);
  return { session, ...fake };
}
test('snapshot freshness reads the real Worker metadata envelope, never a body timestamp', async () => {
  const { session } = setup();
  const fixture = response(addresses[0]);
  for (const asOf of ['2026-10-22T08:00:00.000Z', 'not-a-date']) {
    request.mockResolvedValueOnce({
      ...fixture,
      data: { ...fixture.data, asOf: '2000-01-01T00:00:00.000Z' },
      meta: {
        ...fixture.meta,
        wallet: { ...fixture.meta.wallet, asOf, stale: true },
      },
    });
    const publish = vi.fn();
    await loadWalletSummaries(
      session,
      [addresses[0]],
      new AbortController().signal,
      publish,
    );
    expect(publish.mock.calls[0][1].data.asOf).toBe(
      asOf === 'not-a-date' ? null : asOf,
    );
    expect(publish.mock.calls[0][1].data.stale).toBe(true);
  }
});
test('automatic summaries bound concurrency to four, use public calls and preserve exact quantities', async () => {
  const { session, driver } = setup();
  let active = 0,
    peak = 0;
  const complete = new Map<string, () => void>();
  request.mockImplementation((address) => {
    active++;
    peak = Math.max(peak, active);
    return new Promise<ReturnType<typeof response>>((resolve) => {
      complete.set(address, () => resolve(response(address)));
    }).finally(() => {
      active--;
    });
  });
  const publish = vi.fn();
  const pending = loadWalletSummaries(
    session,
    addresses,
    new AbortController().signal,
    publish,
  );
  expect(request).toHaveBeenCalledTimes(4);
  for (let i = 0; i < addresses.length; i++) {
    await vi.waitFor(() => expect(complete.has(addresses[i])).toBe(true));
    complete.get(addresses[i])?.();
  }
  await pending;
  expect(peak).toBe(4);
  expect(publish).toHaveBeenCalledTimes(9);
  expect(publish.mock.calls[0][1].data.wallet.assets[0].amount).toBe(
    '9007199254740993.123456789',
  );
  expect(driver.token).not.toHaveBeenCalled();
  expect(request.mock.calls[0][1]).toEqual({ signal: expect.any(AbortSignal) });
});
test('identity changes abort active requests, discard late responses and stop queued work', async () => {
  const { session, emit } = setup();
  /** Complete queued fixture work before checking the final state. */
  let finish: () => void = () => {};
  const completion = new Promise<void>((resolve) => {
    finish = resolve;
  });
  request.mockImplementation(async (address) => {
    await completion;
    return response(address);
  });
  const publish = vi.fn();
  const pending = loadWalletSummaries(
    session,
    addresses,
    new AbortController().signal,
    publish,
  );
  expect(request).toHaveBeenCalledTimes(4);
  emit({ ...alice, uid: 'bob' });
  expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  finish();
  await pending;
  expect(request).toHaveBeenCalledTimes(4);
  expect(publish).not.toHaveBeenCalled();
});
test('rate limits stop the remaining queue rather than retrying or flooding the Worker', async () => {
  const { session } = setup();
  request.mockRejectedValue({ status: 429 });
  const publish = vi.fn();
  await loadWalletSummaries(
    session,
    addresses,
    new AbortController().signal,
    publish,
  );
  expect(request).toHaveBeenCalledTimes(4);
  expect(publish).toHaveBeenCalledTimes(9);
  expect(
    publish.mock.calls.every(([, result]) =>
      result.error.includes('temporarily unavailable'),
    ),
  ).toBe(true);
});
test('malformed/wrong-wallet data fails per row without poisoning healthy summaries', async () => {
  const { session } = setup();
  request
    .mockResolvedValueOnce(response(addresses[1]))
    .mockResolvedValueOnce(response(addresses[1]));
  const publish = vi.fn();
  await loadWalletSummaries(
    session,
    addresses.slice(0, 2),
    new AbortController().signal,
    publish,
  );
  expect(
    publish.mock.calls.find(([address]) => address === addresses[0])?.[1].error,
  ).toContain('could not be loaded');
  expect(
    publish.mock.calls.find(([address]) => address === addresses[1])?.[1].data
      .wallet.address,
  ).toBe(addresses[1]);
});
test('unverified sessions and pre-aborted batches send no requests', async () => {
  const { session, emit } = setup();
  const controller = new AbortController();
  controller.abort();
  await loadWalletSummaries(session, addresses, controller.signal, vi.fn());
  emit({ ...alice, verified: false });
  await expect(
    loadWalletSummaries(
      session,
      addresses,
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toMatchObject({ code: 'EMAIL_VERIFICATION_REQUIRED' });
  expect(request).not.toHaveBeenCalled();
});
