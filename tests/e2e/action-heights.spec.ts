/**
 * Compact desktop actions with larger mobile and coarse-pointer targets.
 * @packageDocumentation
 */
import { expect, test } from './support/test';
import { sol, walletAddress } from './support/workerMock';

for (const width of [390, 600, 601, 1440]) {
  test(`standalone actions use the selected height at ${width}px`, async ({
    page,
    api,
  }) => {
    const height = width <= 600 ? '44px' : '36px';
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.goto(`/asset/${sol.mint}`);
      if (theme === 'dark')
        await page.getByRole('button', { name: 'Toggle color theme' }).click();
      await expect(
        page.getByRole('link', { name: 'Log in to save', exact: true }),
      ).toHaveCSS('height', height);
      await page.goto(`/wallet/${walletAddress}`);
      await expect(
        page.getByRole('link', { name: 'Log in to save', exact: true }),
      ).toHaveCSS('height', height);
      await expect(
        page.getByRole('button', { name: 'Load more', exact: true }),
      ).toHaveCSS('height', height);
      api.setHandler((url) =>
        url.pathname === `/v3/wallets/${walletAddress}`
          ? {
              error: {
                code: 'UPSTREAM_UNAVAILABLE',
                message: 'Wallet unavailable',
              },
            }
          : undefined,
      );
      await page.reload();
      await expect(
        page.getByRole('button', { name: 'Retry wallet', exact: true }),
      ).toHaveCSS('height', height);
      api.setHandler(() => undefined);
      await page.goto('/account');
      await expect(
        page.getByRole('button', { name: 'Continue with Google', exact: true }),
      ).toHaveCSS('height', height);
    }
  });
}

test.describe('wide touch devices', () => {
  test.use({ hasTouch: true });
  test('keep larger action targets even at desktop widths', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/asset/${sol.mint}`);
    expect(
      await page.evaluate(() => matchMedia('(any-pointer: coarse)').matches),
    ).toBe(true);
    await expect(
      page.getByRole('link', { name: 'Log in to save', exact: true }),
    ).toHaveCSS('height', '44px');
    await page.goto(`/wallet/${walletAddress}`);
    await expect(
      page.getByRole('button', { name: 'Load more', exact: true }),
    ).toHaveCSS('height', '44px');
  });
});
