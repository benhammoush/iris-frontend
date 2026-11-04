/**
 * Shared scrollbar colours, native sizing and high-contrast fallback across routes.
 * @packageDocumentation
 */
import type { Locator } from '@playwright/test';
import { expect, test } from './support/test';
import { sol, walletAddress } from './support/workerMock';

/** Verify the standard colour policy or the older native pseudo-element fallback.
 * @param area - Page or internal scrolling element.
 * @param color - Expected theme-aware thumb colour.
 * @param nativeWidth - Browser default measured before loading application CSS.
 */
async function expectScrollbar(
  area: Locator,
  color: string,
  nativeWidth: string,
) {
  const standard = await area.evaluate(() =>
    CSS.supports('scrollbar-color', 'auto'),
  );
  if (standard) {
    await expect(area).toHaveCSS(
      'scrollbar-color',
      `${color} rgba(0, 0, 0, 0)`,
    );
  } else {
    expect(
      await area.evaluate(
        (element) =>
          getComputedStyle(element, '::-webkit-scrollbar-thumb')
            .backgroundColor,
      ),
    ).toBe(color);
  }
  if (await area.evaluate(() => CSS.supports('scrollbar-width', 'auto')))
    await expect(area).toHaveCSS('scrollbar-width', nativeWidth);
}

for (const width of [390, 1440]) {
  test(`scrollbars share theme colours without narrowing native controls at ${width}px`, async ({
    page,
    api,
  }, testInfo) => {
    // Headless Firefox reports its native scrollbar width as none, not auto.
    const nativeWidth = await page
      .locator('html')
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue('scrollbar-width'),
      );
    api.setHandler((url) =>
      url.pathname === '/v3/catalogs'
        ? {
            data: {
              topTraded: Array.from({ length: 30 }, (_, index) => ({
                ...sol,
                mint: `scroll-asset-${index}`,
                symbol: `T${index}`,
                name: `Token ${index}`,
              })),
              trending: [],
              recent: [],
            },
          }
        : undefined,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /T0 Token 0/ }),
    ).toBeVisible();
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark')
        await page.getByRole('button', { name: 'Toggle color theme' }).click();
      const color =
        theme === 'light' ? 'rgb(121, 81, 176)' : 'rgb(188, 150, 235)';
      for (const selector of [
        'html',
        '.iris-studio-discovery .iris-catalog-list-rows',
        '.iris-defillama-lists .iris-catalog-list-rows',
        '.iris-recent-transaction-list',
      ]) {
        const areas = page.locator(selector);
        for (const area of await areas.all())
          await expectScrollbar(area, color, nativeWidth);
      }
      const discovery = page.locator(
        '.iris-studio-discovery .iris-catalog-list-rows',
      );
      await discovery.hover();
      await page.mouse.wheel(0, 300);
      await expect
        .poll(() => discovery.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      await page.screenshot({
        path: testInfo.outputPath(`scrollbars-${width}-${theme}.png`),
      });
    }
    for (const route of [
      `/asset/${sol.mint}`,
      `/wallet/${walletAddress}`,
      '/watchlist',
      '/account',
    ]) {
      await page.goto(route);
      if (route.startsWith('/asset/') || route.startsWith('/wallet/'))
        await expect(page.locator('.iris-table-scroll').first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expectScrollbar(
        page.locator('html'),
        'rgb(188, 150, 235)',
        nativeWidth,
      );
      for (const area of await page.locator('.iris-table-scroll').all())
        await expectScrollbar(area, 'rgb(188, 150, 235)', nativeWidth);
      await page.getByRole('button', { name: 'Toggle color theme' }).click();
      await expectScrollbar(
        page.locator('html'),
        'rgb(121, 81, 176)',
        nativeWidth,
      );
      for (const area of await page.locator('.iris-table-scroll').all())
        await expectScrollbar(area, 'rgb(121, 81, 176)', nativeWidth);
      await page.getByRole('button', { name: 'Toggle color theme' }).click();
    }
  });
}

test('forced-colour mode leaves scrollbar colours to the platform', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  test.skip(
    !(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)),
    'This browser does not emulate forced-colour mode.',
  );
  for (const area of [
    page.locator('html'),
    page.locator('.iris-catalog-list-rows').first(),
  ]) {
    if (await page.evaluate(() => CSS.supports('scrollbar-color', 'auto'))) {
      await expect(area).toHaveCSS('scrollbar-color', 'auto');
    } else {
      const thumb = await area.evaluate(
        (element) =>
          getComputedStyle(element, '::-webkit-scrollbar-thumb')
            .backgroundColor,
      );
      expect(thumb).not.toBe('rgb(121, 81, 176)');
      expect(thumb).not.toBe('rgb(188, 150, 235)');
    }
  }
});
