/**
 * Regression coverage and controlled fixtures for wallet.
 * @packageDocumentation
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Wallet from '../../../src/components/Wallet';
import { workerApi } from '../../../src/api/worker';

vi.mock('../../../src/api/worker', () => ({
  workerApi: { wallet: vi.fn(), walletTransactions: vi.fn() },
}));
vi.mock('../../../src/components/Navbar', () => ({
  /** Render the minimal navigation substitute used to isolate this component test. */
  default: () => <nav aria-label="Main navigation" />,
}));

const walletFixture = {
  address: 'WalletCaseSensitive123',
  label: 'Curated Wallet',
  description: 'Public portfolio data from the Worker.',
  valuation: {
    pricedSubtotalUsd: 1234.56,
    holdingCount: 2,
    pricedHoldingCount: 1,
    unpricedHoldingCount: 1,
    complete: false,
  },
  holdingsTruncated: true,
  balances: [
    {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      iconUrl: '/sol.png',
      atomicAmount: '42500000',
      amount: '42.5',
      priceUsd: 2.5,
      valueUsd: 106.25,
    },
  ],
};

const transactions = Array.from({ length: 25 }, (_, index) => ({
  id: `solana-tx-${index + 1}`,
  timestamp: '2026-10-02T12:00:00Z',
  type: index === 0 ? 'Sent' : 'Received',
  source: 'Helius',
  status: 'Confirmed',
  description: 'Token transfer',
  transfers: {
    native: [{ amount: '42500000', decimals: 9 }],
    tokens: [
      {
        symbol: 'JUP',
        mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        amount: '2000000',
        decimals: 6,
      },
    ],
  },
}));

/** Render the wallet route with controlled resource responses. */
function renderWallet() {
  return render(
    <MemoryRouter initialEntries={['/wallet/WalletCaseSensitive123']}>
      <Routes>
        <Route path="/wallet/:address" element={<Wallet />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(workerApi.wallet).mockResolvedValue({
    data: walletFixture,
    meta: { source: 'live', requestId: 'wallet-test' },
  });
  vi.mocked(workerApi.walletTransactions).mockResolvedValue({
    data: { events: transactions, nextCursor: 'next-page' },
    meta: { source: 'live', requestId: 'wallet-test' },
  });
});

test('renders a populated Worker wallet portfolio summary', async () => {
  const { container } = renderWallet();

  expect(await screen.findByText('Curated Wallet')).toBeInTheDocument();
  expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  expect(screen.getByText(/valuations can be partial/i)).toBeInTheDocument();
  const metricsElement = container.querySelector<HTMLElement>(
    '.iris-wallet-hero-metrics',
  );
  if (!metricsElement) throw new Error('Wallet metrics are missing');
  const metrics = within(metricsElement);
  expect(metrics.getByText('Assets')).toBeInTheDocument();
  expect(metrics.getByText('Transactions')).toBeInTheDocument();
  expect(metrics.getByText('1')).toBeInTheDocument();
  expect(metrics.getByText('25')).toBeInTheDocument();
  expect(
    metrics.getByText('Assets returned by the Worker'),
  ).toBeInTheDocument();
  expect(
    metrics.getByText('Transactions returned by Helius'),
  ).toBeInTheDocument();
  expect(screen.queryByText('Valuation coverage')).not.toBeInTheDocument();
  expect(screen.queryByText('Reported balances')).not.toBeInTheDocument();
  expect(
    screen.getByText(/returned balances.*incomplete/i),
  ).toBeInTheDocument();
  expect(screen.getByText('42.5')).toBeInTheDocument();
  expect(screen.getByText('$106.25')).toBeInTheDocument();
  expect(screen.getByText('Priced')).toBeInTheDocument();
  expect(container.querySelector('img[src="/sol.png"]')).toBeInTheDocument();
});

test('preserves valuation badge class tokens for priced and unpriced holdings', async () => {
  vi.mocked(workerApi.wallet).mockResolvedValueOnce({
    data: {
      ...walletFixture,
      balances: [
        ...walletFixture.balances,
        {
          mint: 'unpriced-mint',
          symbol: 'UNKNOWN',
          atomicAmount: '1',
          priceUsd: null,
          valueUsd: null,
        },
      ],
    },
    meta: { source: 'live', requestId: 'wallet-test' },
  });
  renderWallet();
  const priced = await screen.findByText('Priced');
  const unpriced = await screen.findByText('Unpriced');
  expect(priced).toHaveClass('iris-valuation-status');
  expect(priced).not.toHaveClass('iris-valuation-status--unpriced');
  expect(unpriced).toHaveClass(
    'iris-valuation-status',
    'iris-valuation-status--unpriced',
  );
});

test('renders asset-style per-transfer activity rows and loads cursor pages', async () => {
  renderWallet();

  expect((await screen.findAllByTitle('solana-tx-1')).length).toBe(2);
  expect(screen.getAllByTitle('solana-tx-1')[0]).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  expect(screen.getAllByText('Sent').length).toBeGreaterThan(0);
  expect(
    screen.getAllByText('42500000 atomic units (decimals: 9)').length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByText('2000000 atomic units (decimals: 6)').length,
  ).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /Sender/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Recipient/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Amount/ })).toBeInTheDocument();
  vi.mocked(workerApi.walletTransactions).mockResolvedValueOnce({
    meta: { requestId: 'wallet-test' },
    data: {
      events: [
        {
          id: 'solana-tx-26',
          type: 'Swap',
          source: 'Helius',
          status: 'Confirmed',
          description: 'Swap event',
          transfers: [
            {
              symbol: 'JUP',
              mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
              amount: '2',
              decimals: 6,
            },
          ],
        },
      ],
    },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(await screen.findByTitle('solana-tx-26')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Load more' }),
  ).not.toBeInTheDocument();
});

test('shows an explicit transaction error and retries the initial activity request', async () => {
  vi.mocked(workerApi.walletTransactions).mockRejectedValueOnce(
    new Error('Helius unavailable'),
  );
  renderWallet();

  expect(
    await screen.findByText(/transaction history is unavailable/i),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Retry activity' }));
  expect((await screen.findAllByTitle('solana-tx-1')).length).toBe(2);
});

test('advances through empty cursor pages and stops at an explicit end', async () => {
  renderWallet();
  await screen.findAllByTitle('solana-tx-1');
  vi.mocked(workerApi.walletTransactions).mockResolvedValueOnce({
    meta: { requestId: 'wallet-test' },
    data: { events: [], nextCursor: 'third-page' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(workerApi.walletTransactions).toHaveBeenLastCalledWith(
    'WalletCaseSensitive123',
    { cursor: 'next-page' },
  );

  vi.mocked(workerApi.walletTransactions).mockResolvedValueOnce({
    meta: { requestId: 'wallet-test' },
    data: { events: [], nextCursor: null },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(workerApi.walletTransactions).toHaveBeenLastCalledWith(
    'WalletCaseSensitive123',
    { cursor: 'third-page' },
  );
  expect(
    screen.queryByRole('button', { name: 'Load more' }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByTitle('solana-tx-1')[0]).toBeInTheDocument();
});

test('recovers an unavailable wallet summary without losing retry focus', async () => {
  vi.mocked(workerApi.wallet).mockRejectedValueOnce(new Error('Unavailable'));
  renderWallet();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Retry wallet' }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Curated Wallet' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Wallet data loaded.').closest('[role="status"]'),
  ).toHaveFocus();
});

test('retries a failed cursor page while retaining the previous transactions', async () => {
  renderWallet();
  await screen.findAllByTitle('solana-tx-1');
  vi.mocked(workerApi.walletTransactions).mockRejectedValueOnce(
    new Error('Unavailable'),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
  const retry = await screen.findByRole('button', {
    name: 'Retry',
  });
  vi.mocked(workerApi.walletTransactions).mockResolvedValueOnce({
    data: { events: [], nextCursor: null },
    meta: { requestId: 'wallet-test' },
  });
  await userEvent.click(retry);
  expect(
    await screen.findByText('More transactions loaded.'),
  ).toBeInTheDocument();
  expect(screen.getAllByTitle('solana-tx-1')[0]).toBeInTheDocument();
  expect(
    screen.getByText('More transactions loaded.').closest('[role="status"]'),
  ).toHaveFocus();
  expect(workerApi.walletTransactions).toHaveBeenLastCalledWith(
    'WalletCaseSensitive123',
    { cursor: 'next-page' },
  );
});

test('keeps loaded activity visible when loading a later page fails', async () => {
  renderWallet();

  expect((await screen.findAllByTitle('solana-tx-1')).length).toBe(2);
  vi.mocked(workerApi.walletTransactions).mockRejectedValueOnce(
    new Error('Later page unavailable'),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

  expect(
    await screen.findByText(/could not load more transactions/i),
  ).toBeInTheDocument();
  expect(screen.getAllByTitle('solana-tx-1')[0]).toBeInTheDocument();
});

test('keeps the wallet layout and table columns visible while initial data loads', () => {
  vi.mocked(workerApi.wallet).mockReturnValue(new Promise(() => {}));
  vi.mocked(workerApi.walletTransactions).mockReturnValue(
    new Promise(() => {}),
  );
  const { container } = renderWallet();

  expect(screen.getByRole('heading', { name: 'Holdings' })).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Transactions' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Asset' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Time' })).toBeInTheDocument();
  expect(
    container.querySelectorAll('.iris-value-skeleton').length,
  ).toBeGreaterThan(0);
  expect(screen.queryByLabelText('Loading content')).not.toBeInTheDocument();
});
