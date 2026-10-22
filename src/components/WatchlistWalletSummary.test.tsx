import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { walletFrom } from '../data/normalizers';
import WatchlistWalletSummary from './WatchlistWalletSummary';

test('compact wallet cells retain unknown prices and partial/truncated disclosures, not holdings blocks', () => {
  const wallet = walletFrom({
    address: 'So11111111111111111111111111111111111111112',
    balances: [
      { symbol: 'SOL', amount: '9007199254740993.123456789', valueUsd: null },
    ],
    holdingsTruncated: true,
    valuation: { pricedSubtotalUsd: null, complete: false },
  });
  if (!wallet) throw new Error('Missing fixture');
  render(
    <table>
      <tbody>
        <tr>
          <WatchlistWalletSummary
            result={{ data: { wallet, asOf: null, stale: true } }}
            busy={false}
            onRetry={() => {}}
          />
        </tr>
      </tbody>
    </table>,
  );
  expect(
    screen.queryByText('9007199254740993.123456789'),
  ).not.toBeInTheDocument();
  expect(screen.getAllByRole('cell')).toHaveLength(2);
  expect(screen.getByRole('cell', { name: /1\+/ })).toHaveTextContent(
    'list truncated',
  );
  expect(screen.queryByText('$0')).not.toBeInTheDocument();
  expect(screen.getByText('Partial')).toHaveAttribute(
    'title',
    expect.stringContaining('unpriced'),
  );
  expect(screen.getByText('Stale')).toBeVisible();
  expect(screen.getByText(/Snapshot time unavailable/)).toBeInTheDocument();
});

test('a refresh failure keeps the subtotal visible with stale status and a working retry', async () => {
  const wallet = walletFrom({
    address: 'So11111111111111111111111111111111111111112',
    balances: [],
    valuation: { pricedSubtotalUsd: 25, complete: true },
  });
  if (!wallet) throw new Error('Invalid fixture');
  const retry = vi.fn();
  render(
    <table>
      <tbody>
        <tr>
          <WatchlistWalletSummary
            result={{
              data: { wallet, asOf: null, stale: true },
              error: 'Refresh failed.',
            }}
            busy={false}
            onRetry={retry}
          />
        </tr>
      </tbody>
    </table>,
  );
  expect(screen.getByText('$25')).toBeVisible();
  expect(screen.getByText('Stale')).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'last successful summary',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Retry wallet summary' }),
  );
  expect(retry).toHaveBeenCalledOnce();
});
