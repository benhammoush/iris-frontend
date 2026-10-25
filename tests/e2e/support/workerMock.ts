/**
 * Regression coverage and controlled fixtures for worker mock.
 * @packageDocumentation
 */

import type { Page } from '@playwright/test';

export const sol = {
  mint: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  priceUsd: 150.25,
  marketCapUsd: 75_000_000_000,
  change24hPct: 2.5,
  activity: { volume24hUsd: 1_250_000_000 },
  verification: { isVerified: true },
};

export const walletAddress = '7Yk4L5M6N7P8Q9R2tB6dF8gH1jK4L5M6N7P8Q9R2tB6d';

/** Controlled Worker failure fields used by browser request interception. */
type WorkerError = { code: string; message: string };
/** Controlled Worker response body and status for browser tests. */
type MockResponse = {
  data?: unknown;
  error?: WorkerError;
  status?: number;
  meta?: Record<string, unknown>;
};
/** Browser-fixture response operation for one intercepted Worker request. */
type Handler = (url: URL) => MockResponse | undefined;

/** Browser interception controls and unexpected-request assertions. */
export type WorkerMock = {
  requests: URL[];
  /** Replace the controlled response handler for the requested fixture path. */
  setHandler: (handler: Handler) => void;
  /** Fail the browser test when an unrecognized Worker request was observed. */
  assertNoUnexpectedRequests: () => void;
};

const wallet = {
  address: walletAddress,
  label: 'Treasury Wallet',
  description: 'Public portfolio',
  valuation: {
    pricedSubtotalUsd: 1234.56,
    complete: false,
    holdingCount: 2,
    pricedHoldingCount: 1,
    unpricedHoldingCount: 1,
  },
  holdingsTruncated: true,
  balances: [
    {
      mint: sol.mint,
      symbol: 'SOL',
      name: 'Solana',
      atomicAmount: '42500000000',
      amount: '42.5',
      priceUsd: 2.5,
      valueUsd: 106.25,
    },
    {
      mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      symbol: 'JUP',
      name: 'Jupiter',
      atomicAmount: '2000000',
      amount: '2',
      priceUsd: null,
      valueUsd: null,
    },
  ],
};

/** Build a deterministic transaction fixture for the exercised contract. */
const transaction = (id: string, amount: string) => ({
  id,
  timestamp: '2026-10-08T10:00:00.000Z',
  type: 'TRANSFER',
  transfers: [
    { atomicAmount: amount, decimals: 9, from: null, to: walletAddress },
  ],
});

/** Resolve the deterministic Worker response for an intercepted browser request. */
function defaultResponse(url: URL): MockResponse | undefined {
  const { pathname } = url;
  if (pathname === '/v3/assets') return { data: { assets: [sol] } };
  if (pathname === '/v3/catalogs')
    return { data: { topTraded: [sol], trending: [], recent: [] } };
  if (pathname === '/v3/transactions/recent')
    return { data: { network: null, transactions: [] } };
  if (pathname === '/v3/defillama') return { data: {} };
  if (pathname === `/v3/assets/mint/${sol.mint}`)
    return { data: { asset: sol } };
  if (pathname.endsWith('/candles'))
    return {
      data: {
        candles: [
          {
            timestamp: '2026-10-08T10:00:00.000Z',
            openUsd: 149,
            highUsd: 152,
            lowUsd: 148,
            closeUsd: 150.25,
            volumeUsd: 250_000,
          },
        ],
      },
    };
  if (pathname.endsWith('/transactions') && pathname.includes('/assets/'))
    return {
      data: {
        transactions: [
          {
            signature: '5N6n8Xq2w4cP1V3s9Yk7mR2tB6dF8gH1jK4L5M6N7P8Q',
            timestamp: '2026-10-08T10:00:00.000Z',
            action: 'TRANSFER',
            transfers: [{ amount: '12.5', from: null, to: walletAddress }],
          },
        ],
      },
    };
  if (pathname.endsWith('/distribution'))
    return {
      data: {
        accounts: [
          {
            rank: 1,
            tokenAccount: '8qbHbw2BbbTHBW1sBXgze1XNp82btd5Jpi1LjYp5Vh7e',
            owner: walletAddress,
            amount: '5000000',
            supplyPercent: '1.25',
            frozen: false,
          },
        ],
      },
    };
  if (pathname === `/v3/wallets/${walletAddress}`)
    return {
      data: wallet,
      meta: {
        wallet: {
          source: 'helius-das',
          asOf: '2026-10-22T08:00:00.000Z',
          cacheState: 'fresh',
        },
      },
    };
  if (pathname === `/v3/wallets/${walletAddress}/transactions`) {
    return url.searchParams.has('cursor')
      ? {
          data: {
            events: [transaction('tx-2', '1000000000')],
            nextCursor: null,
          },
        }
      : {
          data: {
            events: [transaction('tx-1', '42500000000')],
            nextCursor: 'next-page',
          },
        };
  }
  return undefined;
}

/** Intercept Worker requests and reject unexpected external calls in browser tests. */
export async function installWorkerMock(page: Page): Promise<WorkerMock> {
  const requests: URL[] = [];
  const unexpected: string[] = [];
  let handler: Handler | undefined;

  await page.route(
    `${process.env.VITE_API_BASE || 'https://iris.test'}/**`,
    async (route) => {
      const url = new URL(route.request().url());
      requests.push(url);
      if (route.request().method() !== 'GET') {
        unexpected.push(`${route.request().method()} ${url.pathname}`);
        await route.fulfill({
          status: 405,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: 'Test mock accepts GET only',
            },
          }),
        });
        return;
      }
      const response = handler?.(url) ?? defaultResponse(url);
      if (!response) {
        unexpected.push(`GET ${url.pathname}${url.search}`);
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'UNEXPECTED_REQUEST',
              message: 'No E2E mock response was configured',
            },
          }),
        });
        return;
      }
      const status = response.status ?? (response.error ? 503 : 200);
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(
          response.error
            ? { error: response.error }
            : {
                data: response.data,
                meta: {
                  source: 'test',
                  requestId: 'e2e-request',
                  ...response.meta,
                },
              },
        ),
      });
    },
  );

  return {
    requests,
    /** Replace the controlled response handler for the requested fixture path. */
    setHandler(next) {
      handler = next;
    },
    /** Fail the browser test when an unrecognized Worker request was observed. */
    assertNoUnexpectedRequests() {
      if (unexpected.length)
        throw new Error(`Unexpected Worker requests: ${unexpected.join(', ')}`);
    },
  };
}
