/**
 * Regression coverage and controlled fixtures for full stack.
 * @packageDocumentation
 */

import { expect, test, type Page } from '@playwright/test';

const solMint = 'So11111111111111111111111111111111111111112';
const walletAddress = '7Yk4L5M6N7P8Q9R2tB6dF8gH1jK4L5M6N7P8Q9R2tB6d';
const workerOrigin = 'http://127.0.0.1:8787';
const providerHosts =
  /(?:jupiter|helius|birdeye|defillama|iris\.test|solana\.com)/i;
const unexpectedRequests = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const unexpected: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== workerOrigin && providerHosts.test(url.hostname))
      unexpected.push(url.href);
  });
  unexpectedRequests.set(page, unexpected);
});

test.afterEach(async ({ page }) => {
  await test.info().attach('unexpected-provider-requests', {
    body: JSON.stringify(unexpectedRequests.get(page) || []),
    contentType: 'application/json',
  });
  expect(unexpectedRequests.get(page)).toEqual([]);
});

test('loads dashboard and asset intelligence through the seeded Worker KV', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Market overview' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /SOL/i }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: /SOL/i }).first().click();
  await expect(page).toHaveURL(`/asset/${solMint}`);
  await expect(page.getByRole('heading', { name: /Solana SOL/ })).toBeVisible();
  await expect(page.getByText('$150.25', { exact: true })).toBeVisible();
  await expect(page.getByText('12.5', { exact: true })).toBeVisible();

  const candleRequest = page.waitForRequest(
    (request) =>
      request
        .url()
        .startsWith(`${workerOrigin}/v3/assets/mint/${solMint}/candles`) &&
      new URL(request.url()).searchParams.get('timeframe') === '30m',
  );
  await page.getByRole('button', { name: '30m' }).click();
  await candleRequest;

  await page.getByRole('tab', { name: 'Largest accounts' }).click();
  await expect(page.getByText('5000000')).toBeVisible();
});

test('loads a seeded wallet and follows its Worker cursor', async ({
  page,
}) => {
  await page.goto(`/wallet/${walletAddress}`);
  await expect(
    page.getByRole('heading', { name: 'Treasury Wallet' }),
  ).toBeVisible();
  await expect(
    page
      .locator('.iris-wallet-primary-value')
      .getByText('$6,385.63', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Unpriced', { exact: true })).toBeVisible();
  await expect(
    page.getByText('42500000000 atomic units (decimals: 9)'),
  ).toBeVisible();

  const cursorRequest = page.waitForRequest(
    (request) =>
      request
        .url()
        .startsWith(
          `${workerOrigin}/v3/wallets/${walletAddress}/transactions`,
        ) && new URL(request.url()).searchParams.get('cursor') === 'next-page',
  );
  await page.getByRole('button', { name: 'Load more' }).click();
  await cursorRequest;
  await expect(
    page.getByText('1000000000 atomic units (decimals: 9)'),
  ).toBeVisible();
});
