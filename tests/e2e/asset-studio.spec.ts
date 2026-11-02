/**
 * Studio asset presentation, mint disclosure and responsive chart regressions.
 * @packageDocumentation
 */
import { expect, test } from './support/test';
import { sol } from './support/workerMock';

for (const width of [320, 390, 480, 481, 768, 1000, 1440]) {
  test(`Studio asset preserves its controls and layout at ${width}px`, async ({
    page,
    api,
  }, testInfo) => {
    api.setHandler((url) =>
      url.pathname.endsWith('/candles')
        ? {
            data: {
              candles: url.searchParams.has('before')
                ? []
                : Array.from({ length: 48 }, (_, index) => {
                    const openUsd = 147 + index * 0.07 + Math.sin(index) * 0.4;
                    const closeUsd = openUsd + Math.cos(index) * 0.35;
                    return {
                      timestamp: new Date(
                        Date.UTC(2026, 9, 6, index),
                      ).toISOString(),
                      openUsd,
                      closeUsd,
                      highUsd: Math.max(openUsd, closeUsd) + 0.2,
                      lowUsd: Math.min(openUsd, closeUsd) - 0.2,
                      volumeUsd: 100000 + ((index * 17359) % 150000),
                    };
                  }),
            },
          }
        : undefined,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/asset/${sol.mint}`);
    const chart = page.locator('.iris-birdeye-card');
    const snapshot = page.getByRole('complementary', {
      name: 'Market snapshot',
    });
    await expect(chart.locator('.tv-lightweight-charts')).toBeVisible();
    await expect(chart.locator('.tv-lightweight-charts')).toHaveCSS(
      'height',
      width <= 480 ? '220px' : '245px',
    );
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toHaveText('Home / Assets / SOL');
    await expect(snapshot.locator('.iris-jupiter-metric > span')).toHaveText([
      'Market cap',
      '24H volume',
      'Fully diluted valuation',
      'Liquidity',
      'Circulating supply',
      'Organic score',
    ]);
    const save = page.getByRole('link', {
      name: 'Log in to save',
      exact: true,
    });
    await expect(save).toBeVisible();
    await expect(save).toHaveAccessibleDescription(
      'Return here and click Save after signing in; nothing is saved automatically.',
    );
    await expect(page.locator('.iris-asset-heading')).toContainText(
      'Log in to save',
    );
    const mint = page.locator('.iris-asset-mint a');
    await expect(mint).toHaveAttribute(
      'href',
      `https://explorer.solana.com/address/${sol.mint}`,
    );
    await expect(mint).not.toHaveText(sol.mint);
    const disclosure = page.getByRole('button', {
      name: 'Show mint',
      exact: true,
    });
    await disclosure.focus();
    await disclosure.press('Enter');
    await expect(mint).toHaveText(sol.mint);
    await expect(
      page.getByRole('button', { name: 'Hide mint' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Hide mint' }).click();
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark')
        await page.getByRole('button', { name: 'Toggle color theme' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('.iris-hero-price .iris-positive')).toHaveCSS(
        'color',
        theme === 'light' ? 'rgb(36, 116, 82)' : 'rgb(131, 203, 166)',
      );
      await expect(snapshot.getByText('$75B', { exact: true })).toBeVisible();
      const chartBounds = await chart.boundingBox();
      const snapshotBounds = await snapshot.boundingBox();
      expect(chartBounds).not.toBeNull();
      expect(snapshotBounds).not.toBeNull();
      if (!chartBounds || !snapshotBounds)
        throw new Error('Missing market layout');
      if (width <= 480)
        expect(snapshotBounds.y).toBeGreaterThanOrEqual(
          chartBounds.y + chartBounds.height,
        );
      else expect(snapshotBounds.x).toBeGreaterThan(chartBounds.x);
      const identityBounds = await page
        .locator('.iris-asset-identity')
        .boundingBox();
      const priceBounds = await page.locator('.iris-hero-price').boundingBox();
      if (!identityBounds || !priceBounds)
        throw new Error('Missing asset hero');
      expect(priceBounds.x).toBeGreaterThanOrEqual(
        identityBounds.x + identityBounds.width,
      );
      expect(priceBounds.y).toBeLessThan(
        identityBounds.y + identityBounds.height,
      );
      const tableBounds = await page
        .getByRole('tabpanel', { name: 'Transactions', exact: true })
        .boundingBox();
      const noteBounds = await page
        .locator('.iris-asset-intelligence-note')
        .boundingBox();
      if (!tableBounds || !noteBounds)
        throw new Error('Missing intelligence content');
      expect(noteBounds.y).toBeGreaterThanOrEqual(
        tableBounds.y + tableBounds.height,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`asset-studio-${width}-${theme}.png`),
        fullPage: true,
      });
    }
    await expect(mint).not.toHaveText(sol.mint);
    const transactions = page.getByRole('tab', {
      name: 'Transactions',
      exact: true,
    });
    await transactions.focus();
    await transactions.press('ArrowRight');
    await expect(
      page.getByRole('tab', { name: 'Largest accounts' }),
    ).toBeFocused();
    await expect(page.getByText('5000000', { exact: true })).toBeVisible();
  });
}

test('keeps partial market snapshot values unavailable instead of inventing zeroes', async ({
  page,
  api,
}) => {
  api.setHandler((url) =>
    url.pathname === `/v3/assets/mint/${sol.mint}`
      ? {
          data: {
            asset: {
              mint: sol.mint,
              name: 'Solana',
              symbol: 'SOL',
              priceUsd: 150.25,
              marketCapUsd: 75000000000,
            },
          },
        }
      : undefined,
  );
  await page.goto(`/asset/${sol.mint}`);
  const snapshot = page.getByRole('complementary', { name: 'Market snapshot' });
  await expect(snapshot.getByText('$75B', { exact: true })).toBeVisible();
  await expect(
    snapshot.locator('.iris-jupiter-metric strong').filter({ hasText: /^—$/ }),
  ).toHaveCount(5);
});

test('retains negative trend coloring in both Studio themes', async ({
  page,
  api,
}) => {
  api.setHandler((url) =>
    url.pathname === `/v3/assets/mint/${sol.mint}`
      ? { data: { asset: { ...sol, change24hPct: -2.5 } } }
      : undefined,
  );
  await page.goto(`/asset/${sol.mint}`);
  const change = page.locator('.iris-hero-price .iris-negative');
  await expect(change).toHaveText('-2.50% 24H');
  await expect(change).toHaveCSS('color', 'rgb(179, 67, 85)');
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(change).toHaveCSS('color', 'rgb(235, 151, 167)');
});
