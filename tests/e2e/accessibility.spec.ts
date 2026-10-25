/**
 * Regression coverage and controlled fixtures for accessibility.
 * @packageDocumentation
 */

import { expect, test } from './support/test';
import { sol, walletAddress } from './support/workerMock';

const unavailable = {
  error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Temporarily unavailable' },
};

test('navigates intelligence tabs and their panels with the keyboard', async ({
  page,
}) => {
  await page.goto(`/asset/${sol.mint}`);
  const transactions = page.getByRole('tab', { name: 'Transactions' });
  const distribution = page.getByRole('tab', { name: 'Largest accounts' });
  await transactions.focus();
  await transactions.press('ArrowRight');
  await expect(distribution).toBeFocused();
  await expect(distribution).toHaveAttribute('aria-selected', 'true');
  const panel = page.getByRole('tabpanel', { name: 'Largest accounts' });
  await expect(panel).toBeVisible();
  await expect(distribution).toHaveAttribute(
    'aria-controls',
    (await panel.getAttribute('id')) || '',
  );
  await distribution.press('Tab');
  await expect(panel).toBeFocused();
  await distribution.focus();
  await distribution.press('Home');
  await expect(transactions).toBeFocused();
  await transactions.press('End');
  await expect(distribution).toBeFocused();
});

test('recovers an asset failure without mislabelling it as an empty response', async ({
  page,
  api,
}) => {
  api.setHandler((url) =>
    url.pathname === `/v3/assets/mint/${sol.mint}` ? unavailable : undefined,
  );
  await page.goto(`/asset/${sol.mint}`);
  const retry = page.getByRole('button', { name: 'Retry asset' });
  await expect(retry).toBeVisible();
  await expect(
    page.getByText(`No asset was returned for ${sol.mint}.`),
  ).toHaveCount(0);
  api.setHandler(() => undefined);
  await retry.click();
  await expect(page.getByRole('heading', { name: /Solana SOL/ })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Asset data loaded.' }),
  ).toBeFocused();
});

test('distinguishes unavailable price history from an empty chart and retries it', async ({
  page,
  api,
}) => {
  api.setHandler((url) =>
    url.pathname.endsWith('/candles') ? unavailable : undefined,
  );
  await page.goto(`/asset/${sol.mint}`);
  const retry = page.getByRole('button', {
    name: 'Retry price history',
    exact: true,
  });
  await expect(retry).toBeVisible();
  await expect(page.getByText('No price history is available.')).toHaveCount(0);
  api.setHandler(() => undefined);
  await retry.click();
  await expect(page.locator('.tv-lightweight-charts')).toBeVisible();
});

test('retries unavailable largest-account data', async ({ page, api }) => {
  api.setHandler((url) =>
    url.pathname.endsWith('/distribution') ? unavailable : undefined,
  );
  await page.goto(`/asset/${sol.mint}`);
  await page.getByRole('tab', { name: 'Largest accounts' }).click();
  const retry = page.getByRole('button', { name: 'Retry largest accounts' });
  await expect(retry).toBeVisible();
  api.setHandler(() => undefined);
  await retry.click();
  await expect(page.getByText('5000000', { exact: true })).toBeVisible();
});

test('recovers separate Home resources through their own retry controls', async ({
  page,
  api,
}) => {
  const failed = new Set([
    '/v3/assets',
    '/v3/catalogs',
    `/v3/assets/mint/${sol.mint}`,
    '/v3/defillama',
    '/v3/transactions/recent',
  ]);
  api.setHandler((url) => (failed.has(url.pathname) ? unavailable : undefined));
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Retry market data' }),
  ).toBeVisible();
  for (const path of [
    '/v3/assets',
    '/v3/catalogs',
    `/v3/assets/mint/${sol.mint}`,
  ])
    failed.delete(path);
  await page.getByRole('button', { name: 'Retry market data' }).click();
  await expect(
    page.getByRole('button', { name: /SOL Solana/ }).first(),
  ).toBeVisible();
  failed.delete('/v3/defillama');
  await page.getByRole('button', { name: 'Retry DeFi metrics' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'DeFi metrics loaded.' }),
  ).toBeVisible();
  failed.delete('/v3/transactions/recent');
  await page.getByRole('button', { name: 'Retry network data' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Network data loaded.' }),
  ).toBeVisible();
});

test('recovers the catalog through the shared resource', async ({
  page,
  api,
}) => {
  api.setHandler((url) =>
    url.pathname === '/v3/assets' ? unavailable : undefined,
  );
  await page.goto('/assets');
  const retry = page.getByRole('button', { name: 'Retry catalog' });
  await expect(retry).toBeVisible();
  api.setHandler(() => undefined);
  await retry.click();
  await expect(page.getByRole('link', { name: /SOL Solana/ })).toBeVisible();
});

test('recovers wallet data and a failed cursor page without losing loaded activity', async ({
  page,
  api,
}) => {
  api.setHandler((url) =>
    url.pathname === `/v3/wallets/${walletAddress}` ? unavailable : undefined,
  );
  await page.goto(`/wallet/${walletAddress}`);
  const summaryRetry = page.getByRole('button', { name: 'Retry wallet' });
  await expect(summaryRetry).toBeVisible();
  api.setHandler(() => undefined);
  await summaryRetry.click();
  await expect(
    page.getByRole('heading', { name: 'Treasury Wallet' }),
  ).toBeVisible();
  const firstTransfer = page.getByText(
    '42500000000 atomic units (decimals: 9)',
  );
  await expect(firstTransfer).toBeVisible();
  api.setHandler((url) =>
    url.pathname.endsWith('/transactions') && url.searchParams.has('cursor')
      ? unavailable
      : undefined,
  );
  await page.getByRole('button', { name: 'Load more' }).click();
  const retry = page.getByRole('button', { name: 'Retry', exact: true });
  await expect(retry).toBeVisible();
  await expect(firstTransfer).toBeVisible();
  api.setHandler(() => undefined);
  await retry.click();
  await expect(
    page.getByText('1000000000 atomic units (decimals: 9)'),
  ).toBeVisible();
  await expect(firstTransfer).toBeVisible();
});

test('announces loading and respects reduced motion and skip navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/v3/assets/mint/${sol.mint}?*`, async (route) => {
    await pending;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { asset: sol }, meta: {} }),
    });
  });
  try {
    await page.goto(`/asset/${sol.mint}`);
    await expect(
      page.getByRole('status').filter({ hasText: 'Loading asset data...' }),
    ).toHaveCount(1);
    await expect(page.locator('.iris-value-skeleton').first()).toHaveCSS(
      'animation-name',
      'none',
    );
    await expect(page.locator('.iris-routes')).toHaveCSS(
      'scroll-behavior',
      'auto',
    );
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  } finally {
    release?.();
  }
  await expect(page.getByRole('heading', { name: /Solana SOL/ })).toBeVisible();
});
