/**
 * Regression coverage and controlled fixtures for styling.
 * @packageDocumentation
 */

import { expect, test } from './support/test';
import { sol } from './support/workerMock';
import { openapiUrl } from './support/origins';

for (const width of [1440, 390]) {
  test(`keeps asset summary text readable in both themes at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/asset/${sol.mint}`);
    await expect(
      page.getByRole('heading', { name: /Solana SOL/ }),
    ).toBeVisible();

    const card = page.locator('.iris-asset-jupiter-card');
    const primary = card.locator(
      '.iris-asset-identity h1, .iris-hero-price > strong, .iris-jupiter-metric strong',
    );
    const secondary = card.locator(
      '.iris-asset-identity h1 span, .iris-hero-price > span, .iris-jupiter-metric > span, .iris-jupiter-metric small',
    );
    const mint = card.locator('.iris-asset-identity a');
    const chart = page.locator('.iris-birdeye-card');
    const toolbar = chart.locator('.iris-chart-toolbar');
    const pair = chart.locator('.iris-birdeye-pair strong');
    const caption = chart.locator('.iris-birdeye-pair span');
    const badge = chart.locator('.iris-birdeye-card-header span');
    const selectedTimeframe = chart.locator('.iris-timeframe button.active');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const birdeyeLogo = chart.getByRole('img', {
      name: 'Birdeye',
      exact: true,
    });
    await expect(birdeyeLogo).toHaveCount(1);
    await expect(birdeyeLogo).toHaveAttribute('src', '/birdeye-on-light.png');
    await expect
      .poll(() =>
        birdeyeLogo.evaluate((image) =>
          image instanceof HTMLImageElement ? image.naturalWidth : 0,
        ),
      )
      .toBeGreaterThan(0);
    for (const element of await primary.all()) {
      await expect(element).toHaveCSS('color', 'rgb(23, 33, 47)');
    }
    for (const element of await secondary.all()) {
      await expect(element).toHaveCSS('color', 'rgb(64, 82, 105)');
    }
    await expect(mint).toHaveCSS('color', 'rgb(19, 109, 56)');
    await expect(chart).toHaveCSS('background-color', 'rgb(253, 250, 255)');
    await expect(toolbar).toHaveCSS('background-color', 'rgb(253, 250, 255)');
    await expect(pair).toHaveCSS('color', 'rgb(23, 33, 47)');
    await expect(caption).toHaveCSS('color', 'rgb(64, 82, 105)');
    await expect(badge).toHaveCSS('color', 'rgb(134, 25, 143)');
    await expect(selectedTimeframe).toHaveCSS('color', 'rgb(23, 33, 47)');
    await expect(chart.locator('.tv-lightweight-charts')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('asset-light.png'),
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Toggle color theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(birdeyeLogo).toHaveCount(1);
    await expect(birdeyeLogo).toHaveAttribute('src', '/birdeye-on-dark.png');
    await expect
      .poll(() =>
        birdeyeLogo.evaluate((image) =>
          image instanceof HTMLImageElement ? image.naturalWidth : 0,
        ),
      )
      .toBeGreaterThan(0);
    for (const element of await primary.all()) {
      await expect(element).toHaveCSS('color', 'rgb(255, 255, 255)');
    }
    for (const element of await secondary.all()) {
      await expect(element).toHaveCSS('color', 'rgb(167, 184, 190)');
    }
    await expect(mint).toHaveCSS('color', 'rgb(142, 236, 200)');
    await expect(chart).toHaveCSS('background-color', 'rgb(9, 10, 13)');
    await expect(toolbar).toHaveCSS('background-color', 'rgb(9, 10, 13)');
    await expect(pair).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(caption).toHaveCSS('color', 'rgb(199, 175, 206)');
    await expect(badge).toHaveCSS('color', 'rgb(245, 181, 255)');
    await expect(selectedTimeframe).toHaveCSS('color', 'rgb(255, 255, 255)');
    await page.getByRole('button', { name: 'Toggle color theme' }).click();
    await expect(chart).toHaveCSS('background-color', 'rgb(253, 250, 255)');
    await expect(chart.locator('.tv-lightweight-charts')).toBeVisible();
  });

  test(`preserves dashboard styling after docs navigation at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(openapiUrl, (route) =>
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
    /** Read rendered style values for the browser assertion.
     * @returns Computed header dimensions, background and font.
     */
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
