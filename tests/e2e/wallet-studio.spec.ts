/**
 * Studio wallet workspace geometry, exact quantities and nullable-valuation regressions.
 * @packageDocumentation
 */
import { expect, test } from './support/test';
import { sol, walletAddress } from './support/workerMock';

const wallet = {
  address: walletAddress,
  label: 'Treasury wallet',
  description: 'Public wallet · on-chain holdings & transfers',
  valuation: {
    pricedSubtotalUsd: 27948.6,
    complete: false,
    holdingCount: 4,
    pricedHoldingCount: 3,
    unpricedHoldingCount: 1,
  },
  balances: [
    {
      mint: sol.mint,
      symbol: 'SOL',
      name: 'Solana',
      amount: '82.4',
      atomicAmount: '82400000000',
      priceUsd: 150.25,
      valueUsd: 12380.6,
    },
    {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
      amount: '12500',
      atomicAmount: '12500000000',
      priceUsd: 1,
      valueUsd: 12500,
    },
    {
      mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      symbol: 'JUP',
      name: 'Jupiter',
      amount: '2950',
      atomicAmount: '2950000000',
      priceUsd: 1.04,
      valueUsd: 3068,
    },
    {
      mint: '11111111111111111111111111111111',
      symbol: 'UNKNOWN',
      name: 'Unknown asset',
      amount: '120.500000000000000001',
      atomicAmount: '120500000000000000001',
      priceUsd: null,
      valueUsd: null,
    },
  ],
};

for (const width of [320, 390, 480, 481, 768, 1000, 1440]) {
  test(`Studio wallet matches holdings workspace in both themes at ${width}px`, async ({
    page,
    api,
  }, testInfo) => {
    api.setHandler((url) =>
      url.pathname === `/v3/wallets/${walletAddress}`
        ? { data: wallet }
        : undefined,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/wallet/${walletAddress}`);
    await expect(
      page.getByRole('heading', { name: 'Treasury wallet', exact: true }),
    ).toBeVisible();
    const valuation = page.getByRole('complementary', {
      name: 'Wallet valuation',
    });
    const holdings = page.getByRole('region', {
      name: 'Holdings',
      exact: true,
    });
    const transactions = page.getByRole('region', {
      name: 'Transactions',
      exact: true,
    });
    const disclosure = page.getByRole('button', {
      name: 'Show address',
      exact: true,
    });
    const address = page.locator('.iris-wallet-address-disclosure a');
    await expect(address).toHaveAttribute(
      'href',
      `https://explorer.solana.com/address/${walletAddress}`,
    );
    await expect(address).not.toHaveText(walletAddress);
    await disclosure.focus();
    await disclosure.press('Enter');
    await expect(address).toHaveText(walletAddress);
    await expect(
      page.getByRole('button', { name: 'Hide address' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Hide address' }).click();
    const save = page.getByRole('link', {
      name: 'Log in to save',
      exact: true,
    });
    await expect(save).toHaveAccessibleDescription(
      'Return here and click Save after signing in; nothing is saved automatically.',
    );
    await expect(page.locator('.iris-studio-wallet-hero')).toContainText(
      'Log in to save',
    );
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark')
        await page.getByRole('button', { name: 'Toggle color theme' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(
        valuation.getByText('$27,948.6', { exact: true }),
      ).toBeVisible();
      await expect(valuation).toContainText(
        'Excludes 1 unpriced holding. Not a complete wallet valuation.',
      );
      await expect(valuation).toContainText('Not a lifetime total');
      await expect(holdings.getByText('Unpriced', { exact: true })).toHaveCount(
        1,
      );
      await expect(
        holdings.getByText('120.500000000000000001', { exact: true }),
      ).toHaveCount(1);
      const holdingBounds = await holdings.boundingBox(),
        valueBounds = await valuation.boundingBox(),
        activityBounds = await transactions.boundingBox();
      if (!holdingBounds || !valueBounds || !activityBounds)
        throw new Error('Wallet workspace is missing');
      if (width <= 480)
        expect(valueBounds.y).toBeGreaterThanOrEqual(
          holdingBounds.y + holdingBounds.height,
        );
      else expect(valueBounds.x).toBeGreaterThan(holdingBounds.x);
      expect(activityBounds.y).toBeGreaterThanOrEqual(
        Math.max(
          holdingBounds.y + holdingBounds.height,
          valueBounds.y + valueBounds.height,
        ),
      );
      await expect(valuation).toHaveCSS(
        'background-color',
        theme === 'light' ? 'rgb(238, 230, 246)' : 'rgb(44, 33, 60)',
      );
      await expect(address).toHaveCSS(
        'color',
        theme === 'light' ? 'rgb(121, 81, 176)' : 'rgb(188, 150, 235)',
      );
      const priceHeader = await holdings
        .getByRole('columnheader')
        .nth(1)
        .boundingBox();
      const priceCell = await holdings
        .locator('.iris-table-row')
        .first()
        .locator('.iris-table-cell')
        .nth(1)
        .boundingBox();
      if (!priceHeader || !priceCell)
        throw new Error('Missing holding price column');
      expect(Math.abs(priceHeader.x - priceCell.x)).toBeLessThan(1);
      const activityHeader = await transactions
        .getByRole('columnheader')
        .nth(4)
        .boundingBox();
      const activityRow = transactions.locator('.iris-table-row').first();
      const amountCell = await activityRow
        .locator('.iris-table-cell')
        .nth(4)
        .boundingBox();
      const activityTable = await transactions.getByRole('table').boundingBox();
      if (!activityHeader || !amountCell || !activityTable)
        throw new Error('Missing activity columns');
      expect(activityHeader.height).toBeLessThan(50);
      expect(Math.abs(activityHeader.x - amountCell.x)).toBeLessThan(1);
      expect(amountCell.y + amountCell.height).toBeLessThanOrEqual(
        activityTable.y + activityTable.height,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`wallet-studio-${width}-${theme}.png`),
        fullPage: true,
      });
    }
    await holdings
      .getByRole('textbox', { name: 'Filter holdings' })
      .fill('UNKNOWN');
    await expect(holdings.getByText('SOL', { exact: true })).toHaveCount(0);
    await expect(
      holdings.getByText('120.500000000000000001', { exact: true }),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(
      transactions.getByText('1000000000 atomic units (decimals: 9)', {
        exact: true,
      }),
    ).toHaveCount(1);
    expect(
      api.requests.filter((url) => /\/(candles|history)$/.test(url.pathname)),
    ).toHaveLength(0);
  });
}

test('wallet save entry remains available during a public resource failure', async ({
  page,
  api,
}) => {
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
  await page.goto(`/wallet/${walletAddress}`);
  await expect(
    page.getByText('Wallet data is currently unavailable from the Worker.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Log in to save', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
});

test('unlabelled wallets retain full address identity and an honest empty subtotal', async ({
  page,
  api,
}) => {
  api.setHandler((url) =>
    url.pathname === `/v3/wallets/${walletAddress}`
      ? { data: { address: walletAddress, balances: [] } }
      : undefined,
  );
  await page.goto(`/wallet/${walletAddress}`);
  await expect(
    page.getByRole('heading', { name: 'Public wallet', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.iris-wallet-address-disclosure a'),
  ).toHaveAttribute('title', walletAddress);
  await expect(
    page
      .getByRole('complementary', { name: 'Wallet valuation' })
      .locator('.iris-wallet-primary-value strong'),
  ).toHaveText('—');
  await expect(
    page.getByText('No assets are available for this public wallet.', {
      exact: true,
    }),
  ).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`long exact transfer amounts remain keyboard-scrollable at ${width}px`, async ({
    page,
    api,
  }) => {
    const amount = '18446744073709551615';
    const text = `${amount} atomic units (decimals: 9)`;
    api.setHandler((url) =>
      url.pathname === `/v3/wallets/${walletAddress}/transactions`
        ? {
            data: {
              events: [
                {
                  id: 'exact-amount-test',
                  timestamp: '2026-10-08T10:00:00.000Z',
                  type: 'TRANSFER',
                  transfers: [
                    {
                      atomicAmount: amount,
                      decimals: 9,
                      from: null,
                      to: walletAddress,
                    },
                  ],
                },
              ],
              nextCursor: null,
            },
          }
        : undefined,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/wallet/${walletAddress}`);
    const exact = page.getByRole('group', { name: 'Exact transfer amount' });
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark')
        await page.getByRole('button', { name: 'Toggle color theme' }).click();
      await expect(exact).toHaveText(text);
      await exact.scrollIntoViewIfNeeded();
      await expect(exact).toHaveCSS('white-space', 'nowrap');
      expect(
        await exact.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        ),
      ).toBe(true);
      await exact.evaluate((element) => {
        element.scrollLeft = 0;
      });
      await exact.focus();
      await exact.press('ArrowRight');
      await expect
        .poll(() => exact.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      const visible = await exact.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
        const range = document.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect(),
          bounds = element.getBoundingClientRect(),
          row = element.closest('.iris-table-row')?.getBoundingClientRect();
        return {
          endVisible: text.right <= bounds.right + 1,
          verticallyVisible: element.scrollHeight <= element.clientHeight,
          insideRow: Boolean(
            row && bounds.top >= row.top && bounds.bottom <= row.bottom,
          ),
          atEnd:
            Math.abs(
              element.scrollWidth - element.clientWidth - element.scrollLeft,
            ) <= 1,
        };
      });
      expect(visible).toEqual({
        endVisible: true,
        verticallyVisible: true,
        insideRow: true,
        atEnd: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
