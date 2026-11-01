/**
 * Removed discovery routes must not expose standalone catalog or lookup pages.
 * @packageDocumentation
 */

import { expect, test } from './support/test';

for (const route of ['/assets', '/wallets']) {
  test(`removed ${route} page uses the existing not-found view`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(page.getByRole('main')).toHaveText(
      'Asset or wallet address not found.',
    );
    await expect(page.getByRole('heading')).toHaveCount(0);
    await page.getByRole('link', { name: 'Home', exact: true }).first().click();
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: 'Market overview' }),
    ).toBeVisible();
  });
}
