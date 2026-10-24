import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AccountProvider } from '../../../src/contexts/AccountContext';
import { WatchlistProvider } from '../../../src/contexts/WatchlistContext';
import { createFirebaseDriver } from '../../../src/auth/firebaseDriver';
import { alice, fakeDriver } from '../auth/testSupport';
import { authenticatedRequest } from '../../../src/api/authenticated';
import SaveControl from '../../../src/components/SaveControl';
import Watchlist from '../../../src/components/Watchlist';
import { assetsFrom } from '../../../src/data/normalizers';
import { workerApi } from '../../../src/api/worker';

vi.mock('../../../src/auth/config', () => ({
  accountsEnabled: true,
  accountsConfigured: true,
}));
vi.mock('../../../src/auth/firebaseDriver', () => ({
  createFirebaseDriver: vi.fn(),
}));
vi.mock('../../../src/api/authenticated', () => ({
  authenticatedRequest: vi.fn(),
}));
vi.mock('../../../src/api/worker', () => ({ workerApi: { wallet: vi.fn() } }));
vi.mock('../../../src/components/Navbar', () => ({
  default: () => <nav>Public navigation</nav>,
}));
vi.mock('../../../src/contexts/CatalogContext', () => ({
  useCatalog: () => ({
    assets: assetsFrom([
      {
        mint: address,
        symbol: 'SOL',
        name: 'Solana',
        priceUsd: 150.25,
        change24hPct: 2.5,
        activity: { volume24hUsd: 1000 },
      },
    ]),
  }),
}));
const address = 'So11111111111111111111111111111111111111112';
const unknown = '11111111111111111111111111111111';
const item = { address, savedAt: '2026-10-22T08:00:00.000Z' };
const result = (data: unknown) => ({ data, meta: { requestId: 'test' } });
let fake = fakeDriver();
const request = vi.mocked(authenticatedRequest);
beforeEach(() => {
  fake = fakeDriver();
  vi.mocked(createFirebaseDriver).mockResolvedValue(fake.driver);
  request.mockResolvedValue(result({ assets: [], wallets: [] }));
  vi.mocked(workerApi.wallet).mockImplementation(async (address) =>
    result({
      wallet: {
        address,
        balances: [
          {
            mint: address,
            symbol: 'SOL',
            amount: '1.234567891',
            valueUsd: null,
          },
        ],
        valuation: {
          pricedSubtotalUsd: 150.25,
          complete: false,
          unpricedHoldingCount: 1,
        },
      },
    }),
  );
});
afterEach(() => vi.resetAllMocks());
async function open(control = false) {
  render(
    <MemoryRouter>
      <AccountProvider>
        <WatchlistProvider>
          {control ? (
            <SaveControl kind="asset" address={address} />
          ) : (
            <Watchlist />
          )}
        </WatchlistProvider>
      </AccountProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('link', {
    name: control ? 'Sign in to save to watchlist' : 'Sign in',
  });
  return userEvent.setup();
}
test('login never saves automatically; verification gates requests and all controls', async () => {
  const user = await open(true);
  expect(request).not.toHaveBeenCalled();
  act(() => fake.emit({ ...alice, verified: false }));
  expect(screen.getByRole('link', { name: 'Verify your email' })).toBeVisible();
  expect(request).not.toHaveBeenCalled();
  act(() => fake.emit(alice));
  const save = await screen.findByRole('button', { name: 'Save to watchlist' });
  await waitFor(() => expect(save).toBeEnabled());
  expect(request.mock.calls.every((call) => call[2] === 'GET')).toBe(true);
  request.mockResolvedValueOnce(result({ kind: 'asset', ...item }));
  request.mockResolvedValue(result({ assets: [item], wallets: [] }));
  await user.click(save);
  expect(
    await screen.findByRole('button', { name: 'Remove from watchlist' }),
  ).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Saved to watchlist');
  act(() => fake.emit(null));
  expect(
    screen.queryByRole('button', { name: 'Remove from watchlist' }),
  ).not.toBeInTheDocument();
});
test('unknown references remain links, both sections render and removal restores keyboard focus', async () => {
  const user = await open();
  request.mockResolvedValue(
    result({
      assets: [item, { address: unknown, savedAt: '2026-10-23T08:00:00.000Z' }],
      wallets: [item],
    }),
  );
  act(() => fake.emit(alice));
  const links = await screen.findAllByRole('link', {
    name: new RegExp(address),
  });
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    `/asset/${address}`,
    `/wallet/${address}`,
  ]);
  expect(screen.getByRole('link', { name: unknown })).toHaveAttribute(
    'href',
    `/asset/${unknown}`,
  );
  expect(screen.getAllByText('$150.25').length).toBeGreaterThan(0);
  expect(screen.getByText('$1K')).toBeVisible();
  expect(screen.queryByText('Market cap')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: address })).toHaveTextContent(
    `${address.slice(0, 6)}…${address.slice(-4)}`,
  );
  expect(
    within(screen.getByRole('region', { name: 'Wallets' })).queryByText(
      /Volume/,
    ),
  ).not.toBeInTheDocument();
  request.mockResolvedValueOnce(result({ removed: true }));
  request.mockResolvedValue(
    result({
      assets: [{ address: unknown, savedAt: '2026-10-23T08:00:00.000Z' }],
      wallets: [item],
    }),
  );
  await user.click(
    screen.getByRole('button', { name: `Remove ${address} from assets` }),
  );
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Assets' })).toHaveFocus(),
  );
  expect(screen.queryByRole('link', { name: address })).toHaveAttribute(
    'href',
    `/wallet/${address}`,
  );
});

test('wallet summaries load automatically and retry only the failed wallet', async () => {
  const user = await open();
  request.mockResolvedValue(
    result({ assets: [], wallets: [item, { ...item, address: unknown }] }),
  );
  vi.mocked(workerApi.wallet).mockRejectedValueOnce(
    new Error('raw secret upstream error'),
  );
  act(() => fake.emit(alice));
  const retry = await screen.findByRole('button', {
    name: 'Retry wallet summary',
  });
  await waitFor(() => expect(retry).toBeEnabled());
  expect(vi.mocked(workerApi.wallet)).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(/raw secret/)).not.toBeInTheDocument();
  await user.click(retry);
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Retry wallet summary' }),
    ).not.toBeInTheDocument(),
  );
  expect(vi.mocked(workerApi.wallet)).toHaveBeenCalledTimes(3);
  expect(vi.mocked(workerApi.wallet).mock.calls[2][0]).toBe(
    vi.mocked(workerApi.wallet).mock.calls[0][0],
  );
  expect(
    screen.getByRole('columnheader', { name: 'Priced subtotal' }),
  ).toBeVisible();
  expect(screen.getAllByText('$150.25')).toHaveLength(2);
  expect(screen.queryByText('1.234567891')).not.toBeInTheDocument();
});
test('list and mutation failures expose retry/error without claiming success', async () => {
  const user = await open(true);
  request.mockRejectedValueOnce(new Error('private raw error'));
  act(() => fake.emit(alice));
  expect(await screen.findByRole('alert')).not.toHaveTextContent(
    'private raw error',
  );
  await user.click(screen.getByRole('button', { name: 'Retry watchlist' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Save to watchlist' }),
    ).toBeEnabled(),
  );
  request.mockRejectedValueOnce({ code: 'WATCHLIST_LIMIT_REACHED' });
  await user.click(screen.getByRole('button', { name: 'Save to watchlist' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('at most 100');
  expect(screen.queryByText('Saved to watchlist.')).not.toBeInTheDocument();
});
