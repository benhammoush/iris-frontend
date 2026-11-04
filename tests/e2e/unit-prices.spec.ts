/**
 * Shared unit-price precision across discovery, asset and wallet presentations.
 * @packageDocumentation
 */
import { expect, test } from './support/test';
import { sol, walletAddress } from './support/workerMock';

for (const width of [390, 1440]) {
  for (const [value, display] of [
    [106.264, '$106.26'],
    [1, '$1.00'],
    [0.0000031234567, '$0.0000031235'],
    [0, '$0.00'],
    [null, '—'],
  ] as const) {
    test(`unit price ${value} stays consistent at ${width}px`, async ({
      page,
      api,
    }, testInfo) => {
      const asset = { ...sol, priceUsd: value };
      api.setHandler((url) => {
        if (url.pathname === '/v3/catalogs')
          return { data: { topTraded: [asset], trending: [], recent: [] } };
        if (url.pathname === '/v3/assets') return { data: { assets: [asset] } };
        if (url.pathname === `/v3/assets/mint/${sol.mint}`)
          return { data: { asset } };
        if (url.pathname === `/v3/wallets/${walletAddress}`)
          return {
            data: {
              address: walletAddress,
              label: 'Price test wallet',
              valuation: {
                pricedSubtotalUsd: 1234.56,
                complete: false,
                holdingCount: 1,
                pricedHoldingCount: 1,
                unpricedHoldingCount: 0,
              },
              balances: [{ ...asset, amount: '42.5', valueUsd: 106.25 }],
            },
          };
        return undefined;
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(
        page
          .getByRole('button', { name: /SOL Solana/ })
          .locator('.iris-catalog-list-price'),
      ).toHaveText(`Price ${display}`);
      if (value === 0.0000031234567)
        await page.screenshot({
          path: testInfo.outputPath(`tiny-price-home-${width}.png`),
          fullPage: true,
        });
      await page.goto(`/asset/${sol.mint}`);
      await expect(page.locator('.iris-hero-price strong')).toHaveText(display);
      if (value === 0.0000031234567)
        await page.screenshot({
          path: testInfo.outputPath(`tiny-price-asset-${width}.png`),
          fullPage: true,
        });
      await page.goto(`/wallet/${walletAddress}`);
      const holdings = page.locator('.iris-studio-wallet-holdings');
      await expect(
        holdings.locator('.iris-table-row .iris-table-cell').nth(1),
      ).toHaveText(display);
      await expect(holdings.getByText('42.5', { exact: true })).toHaveCount(1);
      await expect(holdings.getByText('$106.25', { exact: true })).toHaveCount(
        1,
      );
      await expect(
        page.locator('.iris-wallet-primary-value strong'),
      ).toHaveText('$1,234.56');
    });
  }
}
