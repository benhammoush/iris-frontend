/** Studio layout, accessible discovery tabs and data-only rendering regressions.
 * @packageDocumentation
 */
import { expect, test } from './support/test';
import { sol } from './support/workerMock';

const discoveryAssets = [
  sol,
  {
    ...sol,
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    priceUsd: 1,
    change24hPct: 0.01,
  },
  {
    ...sol,
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter',
    priceUsd: 0.83,
    change24hPct: -1.2,
  },
  {
    ...sol,
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa7YB6K2kQmjzkpQ',
    symbol: 'BONK',
    name: 'Bonk',
    priceUsd: 0.000019,
    change24hPct: 3.4,
  },
];

for (const width of [
  320, 390, 600, 601, 768, 900, 901, 1024, 1100, 1101, 1440,
]) {
  test(`Studio Home stays readable and navigable in both themes at ${width}px`, async ({
    page,
    api,
  }, testInfo) => {
    api.setHandler((url) => {
      if (url.pathname === '/v3/catalogs')
        return {
          data: {
            topTraded: discoveryAssets,
            trending: [
              {
                ...sol,
                mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                symbol: 'JUP',
                name: 'Jupiter',
              },
            ],
            recent: [],
          },
        };
      if (url.pathname === '/v3/defillama')
        return {
          data: {
            dexes: {
              total24hUsd: 862000000,
              total7dUsd: 5400000000,
              items: ['Raydium', 'Orca', 'Meteora'].map((name, index) => ({
                name,
                slug: name.toLowerCase(),
                logo: null,
                total24hUsd: 482600000 / (index + 1),
                total7dUsd: 3000000000 / (index + 1),
                change1dPct: index % 2 ? -1.2 : 2.5,
              })),
            },
            protocols: {
              total: 42,
              items: ['Kamino', 'Jito', 'Jupiter'].map((name, index) => ({
                name,
                slug: name.toLowerCase(),
                logo: null,
                category: 'DeFi',
                solanaTvlUsd: 2400000000 / (index + 1),
                change1dPct: 1.5,
                change7dPct: 4.25,
              })),
            },
          },
        };
      if (url.pathname === '/v3/transactions/recent')
        return {
          data: {
            network: {
              chain: {
                state: 'fresh',
                confirmedSlot: 351284019,
                processedSlot: 351284021,
                blockHeight: 329182401,
                epoch: 812,
              },
              performance: { tps: 1647.97, nonVoteTps: 1234.56 },
              fees: { averageFeeLamports: 24000 },
            },
            transactions: [
              {
                signature: 'sample-transaction-signature',
                blockTime: new Date().toISOString(),
                action: 'swap',
                slot: 351284019,
              },
            ],
          },
        };
      return undefined;
    });
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/');
    const discovery = page.getByRole('region', {
      name: 'Jupiter discovery catalogs',
    });
    const network = page.getByRole('region', {
      name: 'Helius Solana network and recent transactions',
    });
    const defi = page.getByRole('region', {
      name: 'DefiLlama Solana dashboard',
    });
    const tabs = page.getByRole('tablist', { name: 'Token discovery' });
    const top = tabs.getByRole('tab', { name: 'Top Volume' });
    const trending = tabs.getByRole('tab', { name: 'Trending' });
    await expect(top).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('tabpanel', { name: 'Top Volume' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('tabpanel', { name: 'Top Volume' })
        .getByRole('button', { name: /SOL Solana/ }),
    ).toBeVisible();
    const requestCount = api.requests.filter(
      (url) => url.pathname === '/v3/catalogs',
    ).length;
    await top.focus();
    await top.press('ArrowRight');
    await expect(trending).toBeFocused();
    await expect(trending).toHaveAttribute('aria-selected', 'true');
    await expect(
      page
        .getByRole('tabpanel', { name: 'Trending' })
        .getByRole('button', { name: /JUP Jupiter/ }),
    ).toBeVisible();
    await trending.press('End');
    await expect(
      page.getByRole('tabpanel', { name: 'New tokens' }),
    ).toContainText('No assets are available.');
    await tabs.getByRole('tab', { name: 'New tokens' }).press('Home');
    await expect(top).toBeFocused();
    await top.press('Tab');
    await expect(
      page.getByRole('tabpanel', { name: 'Top Volume' }),
    ).toBeFocused();
    expect(
      api.requests.filter((url) => url.pathname === '/v3/catalogs'),
    ).toHaveLength(requestCount);
    expect(
      api.requests.filter((url) => /\/(candles|history)$/.test(url.pathname)),
    ).toHaveLength(0);
    await expect(
      network.getByText('Fresh snapshot', { exact: true }),
    ).toBeVisible();
    await expect(
      network.getByText('351,284,021', { exact: true }),
    ).toBeHidden();
    await network.getByText('Technical details', { exact: true }).click();
    await expect(
      network.getByText('351,284,021', { exact: true }),
    ).toBeVisible();
    await network.getByText('Technical details', { exact: true }).click();
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark')
        await page.getByRole('button', { name: 'Toggle color theme' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const solRow = discovery.getByRole('button', { name: /SOL Solana/ });
      await expect(solRow.locator('.iris-catalog-list-volume')).toBeVisible();
      await expect(solRow.locator('.iris-catalog-list-volume')).toHaveText(
        'Volume $1,250,000,000',
      );
      await expect(solRow).toHaveAccessibleName(/Volume \$1,250,000,000/);
      const volumeHeader = discovery.locator(
        '.iris-discovery-columns > :last-child:visible',
      );
      await expect(volumeHeader).toHaveCount(
        width <= 600 || (width >= 901 && width <= 1100) ? 0 : 1,
      );
      await expect(network).toHaveCSS(
        'background-color',
        theme === 'light' ? 'rgb(238, 230, 246)' : 'rgb(44, 33, 60)',
      );
      await expect(discovery).toHaveCSS(
        'border-left-color',
        theme === 'light' ? 'rgb(121, 81, 176)' : 'rgb(188, 150, 235)',
      );
      expect(
        await page.evaluate(() => ({
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          outside: [...document.querySelectorAll('body *')]
            .filter(
              (element) => element.getBoundingClientRect().right > innerWidth,
            )
            .slice(0, 15)
            .map((element) => ({
              tag: element.tagName,
              className: element.className,
              right: element.getBoundingClientRect().right,
              width: element.getBoundingClientRect().width,
            })),
        })),
      ).toEqual({ width, scrollWidth: width, outside: [] });
      const bounds = await Promise.all([
        discovery.boundingBox(),
        network.boundingBox(),
        defi.boundingBox(),
      ]);
      const [d, n, f] = bounds;
      if (!d || !n || !f)
        throw new Error('Studio panels must have visible layout bounds.');
      if (width > 900) {
        expect(Math.abs(d.y - n.y)).toBeLessThanOrEqual(1);
        expect(n.x).toBeGreaterThan(d.x + d.width);
      } else expect(n.y).toBeGreaterThan(d.y + d.height);
      expect(f.y).toBeGreaterThan(Math.max(d.y + d.height, n.y + n.height));
      await page.screenshot({
        path: testInfo.outputPath(`studio-${width}-${theme}.png`),
        fullPage: true,
      });
    }
    await discovery.getByRole('button', { name: /SOL Solana/ }).click();
    await expect(page).toHaveURL(`/asset/${sol.mint}`);
  });
}
