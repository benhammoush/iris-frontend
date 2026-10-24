/**
 * Regression coverage and controlled fixtures for wallet.
 * @packageDocumentation
 */

import { expect, test } from './support/test';
import { walletAddress } from './support/workerMock';

test('renders a wallet, retains unpriced holdings, and appends cursor pages', async ({
  page,
  api,
}) => {
  await page.goto(`/wallet/${walletAddress}`);
  await expect(
    page.getByRole('heading', { name: 'Treasury Wallet' }),
  ).toBeVisible();
  await expect(page.getByText('$1,234.56', { exact: true })).toBeVisible();
  await expect(page.getByText('Unpriced', { exact: true })).toBeVisible();
  await expect(page.getByText('Priced', { exact: true })).toHaveClass(
    /\biris-valuation-status\b/,
  );
  await expect(page.getByText('Unpriced', { exact: true })).toHaveClass(
    /\biris-valuation-status--unpriced\b/,
  );
  await expect(page.getByText('Unpriced', { exact: true })).toHaveCSS(
    'display',
    // Inline flex is blockified because the badge is itself a flex item.
    'flex',
  );
  const holdingRow = page.locator('.iris-table-row--clickable').first();
  await expect(holdingRow).toHaveClass(/\biris-table-row\b/);
  await expect(holdingRow).toHaveCSS('display', 'flex');
  await expect(holdingRow).toHaveCSS('position', 'absolute');
  await expect(
    page.getByText('42500000000 atomic units (decimals: 9)'),
  ).toBeVisible();
  await expect(
    page.getByText(/displayed holdings are incomplete/i),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(
    page.getByText('1000000000 atomic units (decimals: 9)'),
  ).toBeVisible();
  await expect
    .poll(() =>
      api.requests.some(
        (url) =>
          url.pathname.endsWith('/transactions') &&
          url.searchParams.get('cursor') === 'next-page',
      ),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
});

test('retains activity after a cursor failure and retries the same page', async ({
  page,
  api,
}) => {
  let failed = false;
  api.setHandler((url) => {
    if (
      url.pathname === `/v3/wallets/${walletAddress}/transactions` &&
      url.searchParams.get('cursor') === 'next-page' &&
      !failed
    ) {
      failed = true;
      return {
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: 'Later page unavailable',
        },
      };
    }
    return undefined;
  });

  await page.goto(`/wallet/${walletAddress}`);
  const firstTransfer = page.getByText(
    '42500000000 atomic units (decimals: 9)',
  );
  await expect(firstTransfer).toBeVisible();
  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(
    page.getByText('Could not load more transactions.'),
  ).toBeVisible();
  await expect(firstTransfer).toBeVisible();

  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(
    page.getByText('1000000000 atomic units (decimals: 9)'),
  ).toBeVisible();
  await expect(firstTransfer).toBeVisible();
  await expect(page.getByText('Could not load more transactions.')).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  expect(
    api.requests.filter(
      (url) =>
        url.pathname === `/v3/wallets/${walletAddress}/transactions` &&
        url.searchParams.get('cursor') === 'next-page',
    ),
  ).toHaveLength(2);
});

test('retries an unavailable initial wallet activity request', async ({
  page,
  api,
}) => {
  let failed = false;
  api.setHandler((url) => {
    if (
      url.pathname === `/v3/wallets/${walletAddress}/transactions` &&
      !url.searchParams.has('cursor') &&
      !failed
    ) {
      failed = true;
      return {
        error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Helius unavailable' },
      };
    }
    return undefined;
  });

  await page.goto(`/wallet/${walletAddress}`);
  await expect(
    page.getByText('Helius transaction history is unavailable.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry activity' }).click();
  await expect(
    page.getByText('42500000000 atomic units (decimals: 9)'),
  ).toBeVisible();
});
