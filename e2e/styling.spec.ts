import { expect, test } from './support/test';
import { sol } from './support/workerMock';

for (const width of [1440, 390]) {
  test(`preserves dashboard styling after docs navigation at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://openapi.test/openapi.yaml', (route) =>
      route.fulfill({
        contentType: 'application/yaml',
        body: 'openapi: 3.0.3\ninfo:\n  title: Styling API\n  version: 1.0.0\npaths: {}\n',
      }),
    );
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Market overview' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /SOL Solana/ }).first(),
    ).toBeVisible();
    const styles = () =>
      page.locator('.iris-header').evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          height: style.height,
          background: style.backgroundColor,
          font: style.fontFamily,
        };
      });
    const before = await styles();
    await page.screenshot({
      path: testInfo.outputPath('dashboard-light.png'),
      fullPage: true,
    });
    await page
      .getByRole('link', { name: 'API Docs', exact: true })
      .filter({ visible: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Styling API', exact: true }),
    ).toBeVisible();
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).resolves.toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('scalar.png'),
      fullPage: true,
    });
    await page.getByRole('link', { name: 'Back to Iris', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Market overview' }),
    ).toBeVisible();
    expect(await styles()).toEqual(before);
    await page.getByRole('button', { name: 'Toggle color theme' }).click();
    await expect
      .poll(async () => (await styles()).background)
      .not.toBe(before.background);
    await page.screenshot({
      path: testInfo.outputPath('dashboard-dark.png'),
      fullPage: true,
    });
    await page
      .getByRole('button', { name: /SOL Solana/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: /Solana SOL/ }),
    ).toBeVisible();
    await expect(page.locator('.tv-lightweight-charts')).toBeVisible();
    const chart = await page.locator('.tv-lightweight-charts').boundingBox();
    expect(chart?.width).toBeGreaterThan(200);
    expect(chart?.height).toBeGreaterThan(100);
    await expect(page).toHaveURL(`/asset/${sol.mint}`);
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).resolves.toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('asset-dark.png'),
      fullPage: true,
    });
  });
}
