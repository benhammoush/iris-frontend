/**
 * Regression coverage and controlled fixtures for smoke.
 * @packageDocumentation
 */

import { expect, test } from './support/test';
import { sol } from './support/workerMock';

for (const width of [390, 1440]) {
  test(`Home leads with data instead of introductory filler at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const heading = page.getByRole('heading', {
      name: 'Market overview',
      level: 1,
    });
    await expect(heading).toHaveClass('iris-sr-only');
    await expect(heading).toHaveCSS('width', '1px');
    await expect(page.getByText('Market monitor', { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByText(
        'Live Solana network data and market discovery from the Iris Worker.',
        { exact: true },
      ),
    ).toHaveCount(0);
    const provider = page.getByRole('region', {
      name: 'Jupiter discovery catalogs',
    });
    await expect(provider).toBeInViewport();
    const headerBounds = await page.getByRole('banner').boundingBox();
    const providerBounds = await provider.boundingBox();
    if (!headerBounds || !providerBounds)
      throw new Error('Home data and navigation must have visible bounds.');
    expect(
      providerBounds.y - headerBounds.y - headerBounds.height,
    ).toBeLessThanOrEqual(40);
  });
}

test('opens the dashboard and navigates to a catalog asset', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Solana network', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('button', { name: /SOL/i }).first(),
  ).toBeVisible();

  await page
    .getByRole('main')
    .getByRole('button', { name: /SOL/i })
    .first()
    .click();
  await expect(page).toHaveURL(`/asset/${sol.mint}`);
  await expect(page.getByRole('heading', { name: /Solana SOL/ })).toBeVisible();
});
