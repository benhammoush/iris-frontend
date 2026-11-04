/**
 * Consistent underlined table links and visible, unclipped keyboard focus cues.
 * @packageDocumentation
 */
import { expect, test } from './support/test';
import { sol, walletAddress } from './support/workerMock';

for (const width of [390, 1440]) {
  test(`table links and filter focus match across routes at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.goto(`/asset/${sol.mint}`);
      if (theme === 'dark')
        await page.getByRole('button', { name: 'Toggle color theme' }).click();
      const color =
        theme === 'light' ? 'rgb(121, 81, 176)' : 'rgb(188, 150, 235)';
      for (const route of [`/asset/${sol.mint}`, `/wallet/${walletAddress}`]) {
        await page.goto(route);
        const link = page.locator('.iris-table-cell a').first();
        await expect(link).toBeVisible();
        await expect(link).toHaveCSS('color', color);
        await expect(link).toHaveCSS('text-decoration-line', 'underline');
        await expect(link).toHaveCSS('text-underline-offset', '3px');
        await page.keyboard.press('Tab');
        await link.focus();
        await expect(link).toBeFocused();
        await expect(link).toHaveCSS('outline-color', color);
        await expect(link).toHaveCSS('outline-width', '2px');
        await expect(link).toHaveCSS('outline-offset', '-2px');
        const filter = page.getByRole('textbox', {
          name: route.startsWith('/asset/')
            ? 'Filter mint transfers'
            : 'Filter wallet transfers',
        });
        await filter.focus();
        await expect(filter).toBeFocused();
        await expect(filter).toHaveCSS('outline-color', color);
        await expect(filter).toHaveCSS('outline-width', '2px');
        await expect(filter).toHaveCSS('outline-offset', '-2px');
        await page.screenshot({
          path: testInfo.outputPath(
            `filter-focus-${route.startsWith('/asset/') ? 'asset' : 'wallet'}-${width}-${theme}.png`,
          ),
        });
      }
      const load = page.getByRole('button', { name: 'Load more', exact: true });
      await load.focus();
      await expect(load).toHaveCSS('outline-color', color);
      await expect(load).toHaveCSS('outline-offset', '3px');
    }
  });
}

test('focus indicators retain system colours in forced-colour mode', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(`/wallet/${walletAddress}`);
  const filter = page.getByRole('textbox', { name: 'Filter wallet transfers' });
  await filter.focus();
  await expect(filter).toHaveCSS('outline-width', '2px');
  const color = await filter.evaluate(
    (element) => getComputedStyle(element).outlineColor,
  );
  expect(color).not.toBe('rgb(121, 81, 176)');
  expect(color).not.toBe('rgb(188, 150, 235)');
});
