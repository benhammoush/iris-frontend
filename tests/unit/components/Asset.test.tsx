import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import Asset from '../../../src/components/Asset';
import { workerApi } from '../../../src/api/worker';

vi.mock('../../../src/components/Navbar', () => ({ default: () => <nav /> }));
vi.mock('../../../src/design-system', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../src/design-system')>();
  return {
    ...actual,
    CandlestickChart: ({
      candles,
      onLoadEarlier,
      canLoadEarlier,
    }: ComponentProps<typeof actual.CandlestickChart>) => (
      <div>
        <output aria-label="Candle count">{candles.length}</output>
        <button
          disabled={!canLoadEarlier}
          onClick={() => void onLoadEarlier?.()}
        >
          Load earlier test candles
        </button>
      </div>
    ),
  };
});

const mint = 'So11111111111111111111111111111111111111112';
const asset = { mint, symbol: 'SOL', name: 'Solana', priceUsd: 150 };
const meta = { requestId: 'asset-test' };
const candle = (timestamp: string) => ({
  timestamp,
  openUsd: 149,
  highUsd: 152,
  lowUsd: 148,
  closeUsd: 150,
  volumeUsd: 1000,
});
const currentCandle = candle('2026-10-08T10:00:00.000Z');
const olderCandle = candle('2026-10-08T09:00:00.000Z');

function renderAsset() {
  return render(
    <MemoryRouter initialEntries={[`/asset/${mint}`]}>
      <Routes>
        <Route path="/asset/:mint" element={<Asset />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(workerApi, 'asset').mockResolvedValue({ data: { asset }, meta });
  vi.spyOn(workerApi, 'assetCandles').mockResolvedValue({
    data: { candles: [currentCandle] },
    meta,
  });
  vi.spyOn(workerApi, 'assetTransactions').mockResolvedValue({
    data: { transactions: [] },
    meta,
  });
  vi.spyOn(workerApi, 'assetDistribution').mockResolvedValue({
    data: { accounts: [] },
    meta,
  });
});
afterEach(() => vi.restoreAllMocks());

test('recovers unavailable asset data and keeps focus on its feedback', async () => {
  vi.mocked(workerApi.asset).mockRejectedValueOnce(new Error('Unavailable'));
  renderAsset();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Retry asset' }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Solana SOL' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Asset data loaded.').closest('[role="status"]'),
  ).toHaveFocus();
});

test('uses roving keyboard focus and labelled panels for intelligence tabs', async () => {
  renderAsset();
  await screen.findByRole('heading', { name: 'Solana SOL' });
  const transactions = screen.getByRole('tab', { name: 'Transactions' });
  const distribution = screen.getByRole('tab', { name: 'Largest accounts' });
  transactions.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(distribution).toHaveFocus();
  expect(distribution).toHaveAttribute('aria-selected', 'true');
  expect(transactions).toHaveAttribute('tabindex', '-1');
  expect(
    screen.getByRole('tabpanel', { name: 'Largest accounts' }),
  ).toHaveAttribute('id', distribution.getAttribute('aria-controls'));
  await userEvent.keyboard('{Home}');
  expect(transactions).toHaveFocus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(distribution).toHaveFocus();
});

test('retains the chart after an earlier-history failure and supports an explicit retry', async () => {
  vi.mocked(workerApi.assetCandles).mockImplementation(
    async (_mint, _timeframe, _options, before) => {
      if (before) throw new Error('Earlier history unavailable');
      return { data: { candles: [currentCandle] }, meta };
    },
  );
  renderAsset();
  await screen.findByRole('heading', { name: 'Solana SOL' });
  await userEvent.click(
    screen.getByRole('button', { name: 'Load earlier test candles' }),
  );
  const retry = await screen.findByRole('button', {
    name: 'Retry earlier history',
  });
  expect(screen.getByLabelText('Candle count')).toHaveTextContent('1');
  vi.mocked(workerApi.assetCandles).mockResolvedValueOnce({
    data: { candles: [olderCandle] },
    meta,
  });
  await userEvent.click(retry);
  await waitFor(() =>
    expect(screen.getByLabelText('Candle count')).toHaveTextContent('2'),
  );
  expect(
    screen.getByRole('button', { name: 'Load earlier test candles' }),
  ).toBeEnabled();
});

test('aborts earlier-history work and ignores its late result after a timeframe change', async () => {
  let finish:
    | ((value: Awaited<ReturnType<typeof workerApi.assetCandles>>) => void)
    | undefined;
  let signal: AbortSignal | undefined;
  const pending = new Promise<
    Awaited<ReturnType<typeof workerApi.assetCandles>>
  >((resolve) => {
    finish = resolve;
  });
  vi.mocked(workerApi.assetCandles).mockImplementation(
    async (_mint, _timeframe, options, before) => {
      if (before) {
        signal = options?.signal;
        return pending;
      }
      return { data: { candles: [currentCandle] }, meta };
    },
  );
  renderAsset();
  await screen.findByRole('heading', { name: 'Solana SOL' });
  await userEvent.click(
    screen.getByRole('button', { name: 'Load earlier test candles' }),
  );
  await userEvent.click(screen.getByRole('button', { name: '30m' }));
  expect(signal?.aborted).toBe(true);
  await act(async () => finish?.({ data: { candles: [olderCandle] }, meta }));
  expect(screen.getByLabelText('Candle count')).toHaveTextContent('1');
});
