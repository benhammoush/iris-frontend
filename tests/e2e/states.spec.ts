/**
 * Regression coverage and controlled fixtures for states.
 * @packageDocumentation
 */

import { expect, test } from './support/test';
import { sol } from './support/workerMock';

test('shows an empty chart without reporting an unavailable asset', async ({
  page,
  api,
}) => {
  api.setHandler((url) => {
    if (url.pathname.endsWith('/candles')) return { data: { candles: [] } };
    return undefined;
  });
  await page.goto(`/asset/${sol.mint}`);
  await expect(page.getByText('No price history is available.')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Solana SOL', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry asset' })).toHaveCount(
    0,
  );
});

test('shows an unavailable asset without reporting an empty chart', async ({
  page,
  api,
}) => {
  api.setHandler((url) =>
    url.pathname === `/v3/assets/mint/${sol.mint}`
      ? {
          error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Asset unavailable' },
        }
      : undefined,
  );
  await page.goto(`/asset/${sol.mint}`);
  await expect(
    page.getByText('Asset data is currently unavailable from the Worker.'),
  ).toBeVisible();
  await expect(page.getByText('No price history is available.')).toHaveCount(0);
});
