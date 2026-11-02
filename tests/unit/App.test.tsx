/**
 * Regression coverage and controlled fixtures for app.
 * @packageDocumentation
 */

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { APP_DISPLAY_VERSION } from '../../src/appVersion';

const catalogFixture = {
  topTraded: [
    {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      priceUsd: 1,
      activity: { volume24hUsd: 250000 },
    },
  ],
  trending: [
    {
      mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      symbol: 'JUP',
      name: 'Jupiter',
      priceUsd: 1,
      change24hPct: 3.5,
      activity: { volume24hUsd: 12345 },
      verification: { isVerified: false },
    },
  ],
  recent: [
    {
      mint: 'NewPool111111111111111111111111111111111111',
      symbol: 'NEW',
      name: 'New pool',
      priceUsd: 0.1,
      change24hPct: -1.25,
      activity: { volume24hUsd: 10000 },
    },
  ],
};

const defillamaFixture = {
  dexes: {
    total24hUsd: 1250000,
    total7dUsd: 7000000,
    items: [
      {
        name: 'Jupiter',
        slug: 'jupiter',
        logo: 'https://example.com/jupiter.png',
        total24hUsd: 750000,
        total7dUsd: 4500000,
        change1dPct: 2.5,
      },
    ],
  },
  protocols: {
    total: 42,
    items: [
      {
        name: 'Kamino',
        slug: 'kamino-finance',
        logo: null,
        category: 'Lending',
        solanaTvlUsd: 125000000,
        change1dPct: -1.5,
        change7dPct: 4.25,
      },
    ],
  },
};

beforeEach(() => {
  window.history.pushState({}, '', '/');
  globalThis.fetch = vi.fn<typeof fetch>((input) => {
    const url = input instanceof Request ? input.url : input.toString();
    const data = url.includes('/candles')
      ? { data: { candles: [] } }
      : url.includes('/history')
        ? { data: { history: [] } }
        : url.includes('/v3/defillama')
          ? { data: defillamaFixture }
          : url.includes('/v3/transactions/recent')
            ? {
                data: {
                  network: {
                    chain: {
                      processedSlot: 1,
                      confirmedSlot: 2,
                      blockHeight: 3,
                      epoch: 4,
                      state: 'fresh',
                    },
                    performance: { tps: 123.456, nonVoteTps: 78.9 },
                    fees: { averageFeeLamports: 456789 },
                  },
                  transactions: [
                    {
                      signature:
                        'RecentSignature111111111111111111111111111111111',
                      slot: 123,
                      blockTime: '2026-10-03T12:00:00Z',
                      status: 'confirmed',
                      action: 'swap',
                    },
                  ],
                },
                meta: { recentTransactions: { freshness: 'fresh' } },
              }
            : url.includes('/v3/network')
              ? {
                  data: {
                    chain: {
                      processedSlot: 1,
                      confirmedSlot: 2,
                      blockHeight: 3,
                      epoch: 4,
                      state: 'fresh',
                    },
                    performance: { tps: 123.456, nonVoteTps: 78.9 },
                    fees: { averageFeeLamports: 456789 },
                  },
                }
              : url.includes('/v3/catalogs')
                ? { data: catalogFixture }
                : url.includes(
                      '/v3/assets/mint/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                    )
                  ? {
                      data: {
                        mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                        symbol: 'JUP',
                        name: 'Jupiter',
                        priceUsd: 1,
                      },
                    }
                  : url.includes('/v3/assets/mint/')
                    ? {
                        data: {
                          mint: 'So11111111111111111111111111111111111111112',
                          symbol: 'SOL',
                          name: 'Solana',
                          priceUsd: 1,
                          change24hPct: 3.5,
                          marketCapUsd: 100,
                          liquidityUsd: 50,
                          activity: { volume24hUsd: 25 },
                        },
                      }
                    : url.includes('/v3/assets')
                      ? {
                          data: [
                            {
                              mint: 'So11111111111111111111111111111111111111112',
                              symbol: 'SOL',
                              name: 'Solana',
                              priceUsd: 1,
                            },
                            {
                              mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                              symbol: 'JUP',
                              name: 'Jupiter',
                              priceUsd: 1,
                            },
                          ],
                        }
                      : { data: [] };
    return Promise.resolve(new Response(JSON.stringify(data)));
  });
});

test('renders the Worker-backed portfolio shell', async () => {
  const { unmount } = render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  expect(
    await screen.findByPlaceholderText(
      /search assets or paste a wallet address/i,
    ),
  ).toBeInTheDocument();
  await screen.findByRole('heading', { name: 'Recent Solana transactions' });
  expect(
    screen.getByRole('heading', { level: 1, name: 'Market overview' }),
  ).toHaveClass('iris-sr-only');
  expect(screen.queryByText('Market monitor')).not.toBeInTheDocument();
  expect(
    screen.queryByText(/Live Solana network data and market discovery/),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('columnheader', { name: 'Signature' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('columnheader', { name: 'Action' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/RecentSi.*11111111/)).toBeInTheDocument();
  expect(screen.getByText('Swap')).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Jupiter DEX' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Top Volume' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Trending' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'New tokens' })).toBeInTheDocument();
  expect(
    [...document.querySelectorAll('.iris-catalog-list-volume')].map(
      (element) => element.textContent,
    ),
  ).toContain('Volume $12,345');
  expect(screen.getByText('Unverified')).toBeInTheDocument();
  expect(screen.queryByText('Tracked assets')).not.toBeInTheDocument();
  expect(screen.queryByText('Assets priced')).not.toBeInTheDocument();
  expect(screen.queryByText('Highest 24H volume')).not.toBeInTheDocument();
  expect(
    screen.queryByText(/global reviewed-pool activity/i),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/price history/i)).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /SOL .*show details/ }),
  ).toBeInTheDocument();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) =>
        (url instanceof Request ? url.url : url.toString()).includes(
          '/v3/wallets',
        ),
      ),
  ).toBe(false);
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) =>
        (url instanceof Request ? url.url : url.toString()).includes(
          '/v3/network',
        ),
      ),
  ).toBe(false);
  unmount();
});

test('renders the Studio discovery/network row above DeFi with safe protocol links', async () => {
  const { container } = render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  await screen.findByRole('heading', { name: 'Top DEXes' });
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) =>
        (url instanceof Request ? url.url : url.toString()).includes(
          '/v3/defillama',
        ),
      ),
  ).toBe(true);
  expect(screen.getByText('Kamino')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Kamino/ })).toHaveAttribute(
    'href',
    'https://defillama.com/protocol/kamino-finance',
  );
  expect(
    container.querySelector('img[src="https://example.com/jupiter.png"]'),
  ).toBeInTheDocument();
  expect(
    container.querySelector('.iris-defillama-lists .iris-asset-icon-fallback'),
  ).toHaveTextContent('1');
  expect(
    container.querySelector(
      '.iris-defillama-lists .iris-catalog-list--volume .iris-catalog-list-identity small',
    ),
  ).toHaveTextContent('1D +2.50%');
  expect(
    container.querySelector(
      '.iris-defillama-lists .iris-catalog-list--trending .iris-catalog-list-identity small',
    ),
  ).toHaveTextContent('1D -1.50% · 7D +4.25%');
  expect(screen.getByText('24H $750K')).toBeInTheDocument();
  expect(screen.getByText('7D $4.5M')).toBeInTheDocument();
  expect(screen.getByText('Solana TVL $125M')).toBeInTheDocument();
  expect(
    container.querySelectorAll('.iris-defillama-lists .iris-catalog-list'),
  ).toHaveLength(2);
  /** Require the expected test element instead of continuing with a missing fixture node.
   * @param selector - CSS selector for the expected element.
   * @returns That element, rejecting a missing fixture node.
   */
  function required(selector: string): Element {
    const element = container.querySelector(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  }
  const cards = [...required('.iris-page').children];
  expect(cards.indexOf(required('.iris-studio-top'))).toBeLessThan(
    cards.indexOf(required('.iris-defillama-card')),
  );
  expect(required('.iris-studio-top').firstElementChild).toBe(
    required('.iris-studio-discovery'),
  );
  expect(required('.iris-studio-top').lastElementChild).toBe(
    required('.iris-helius-card'),
  );
});

test('Jupiter discovery rows use the styled list structure and open canonical asset detail', async () => {
  const { container } = render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  await screen.findByText('JUP');
  expect(container.querySelector('.iris-studio-discovery')).toBeInTheDocument();
  expect(
    container.querySelectorAll('.iris-studio-discovery .iris-catalog-list'),
  ).toHaveLength(3);
  expect(screen.queryByText('Jupiter 24H activity')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: 'Trending' }));
  await userEvent.click(screen.getByText('JUP'));
  expect(window.location.pathname).toContain('/asset/JUPyiwrY');
});

test('uses Home-only navigation and shows the selected market metrics in the Jupiter navbar strip', async () => {
  const { container } = render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  await screen.findByRole('heading', { name: 'Market overview' });
  expect(
    within(screen.getByRole('banner')).queryByText(APP_DISPLAY_VERSION),
  ).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('contentinfo')).getByText(APP_DISPLAY_VERSION),
  ).toBeVisible();
  expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(
    0,
  );
  expect(
    screen.queryByRole('link', { name: 'Market' }),
  ).not.toBeInTheDocument();
  expect(
    container.querySelector('.iris-studio-discovery .iris-studio-heading span'),
  ).toHaveTextContent('Jupiter');
  expect(
    screen.getByRole('heading', { name: 'Top Volume' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Trending' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'New tokens' })).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /FDV/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /SOL .*show details/ }),
  ).toHaveTextContent('SOL $1.00');
  expect(
    screen.getByRole('button', { name: /TPS .*show details/ }),
  ).toHaveTextContent('TPS 123.46');
  await userEvent.click(
    screen.getByRole('button', { name: /TPS .*show details/ }),
  );
  expect(
    screen.getByRole('region', { name: 'Network performance details' }),
  ).toHaveTextContent('True TPS78.9Average fee0.000457 SOL');
  expect(screen.queryByText('Average paid fee')).not.toBeInTheDocument();
  expect(container.querySelectorAll('.iris-metric-card')).toHaveLength(0);
  expect(container.querySelector('.iris-metric-sol')).toBeInTheDocument();
  expect(container.querySelector('.iris-metric-tps')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /Chart/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /Preview/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText('Data from Jupiter, Birdeye, and DefiLlama'),
  ).toBeInTheDocument();
});

test('keeps navbar market and network summaries populated outside Home', async () => {
  window.history.pushState(
    {},
    '',
    '/asset/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  );
  const assetPage = render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  expect(
    await screen.findByRole('button', { name: 'SOL $1.00, show details' }),
  ).toHaveTextContent('SOL $1.00');
  expect(
    screen.queryByRole('button', { name: /JUP .*show details/ }),
  ).not.toBeInTheDocument();
  expect(
    await screen.findByRole('button', { name: /TPS 123.46, show details/ }),
  ).toHaveTextContent('TPS 123.46');
  assetPage.unmount();

  window.history.pushState(
    {},
    '',
    '/wallet/So11111111111111111111111111111111111111112',
  );
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  expect(
    await screen.findByRole('button', { name: 'SOL $1.00, show details' }),
  ).toHaveTextContent('SOL $1.00');
  expect(
    await screen.findByRole('button', { name: /TPS 123.46, show details/ }),
  ).toHaveTextContent('TPS 123.46');
});

test('asset table click and keyboard navigation open asset detail', async () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  await screen.findByText('JUP');
  await userEvent.click(screen.getByRole('tab', { name: 'Trending' }));
  await act(async () => {
    await userEvent.click(screen.getByText('JUP'));
  });
  expect(window.location.pathname).toContain('/asset/JUPyiwrY');
});

test('asset table rows support keyboard navigation', async () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  await screen.findByText('JUP');
  await userEvent.click(screen.getByRole('tab', { name: 'Trending' }));
  const row = screen
    .getAllByRole('button')
    .find((button) => button.textContent?.includes('JUP'));
  expect(row).toBeTruthy();
  if (!row) throw new Error('Jupiter row is missing.');
  await userEvent.type(row, '{enter}');
  expect(window.location.pathname).toContain('/asset/JUPyiwrY');
});

test('Home does not request Birdeye candles or render graph controls', async () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  await screen.findByRole('heading', { name: 'Market overview' });
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) =>
        (url instanceof Request ? url.url : url.toString()).includes(
          '/candles',
        ),
      ),
  ).toBe(false);
  expect(screen.queryByRole('button', { name: '7D' })).not.toBeInTheDocument();
});
