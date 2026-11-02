/**
 * Responsive navigation, secondary documentation and visible summary metrics.
 * @packageDocumentation
 */

import { expect, test } from './support/test';
import { openapiUrl } from './support/origins';
import { APP_DISPLAY_VERSION } from '../../src/appVersion';

test.describe('touch metric disclosures', () => {
  test.use({ hasTouch: true });
  for (const width of [320, 390]) {
    test(`tap reveals metric details and outside tap dismisses them at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      const sol = page.getByRole('button', {
        name: 'SOL $150.25, show details',
      });
      const market = page.getByRole('region', { name: 'SOL market details' });
      await sol.tap();
      await expect(market).toBeVisible();
      await page.getByRole('button', { name: /TPS .*show details/ }).tap();
      await expect(market).toBeHidden();
      const network = page.getByRole('region', {
        name: 'Network performance details',
      });
      await expect(network).toBeVisible();
      await page.getByRole('main').tap({ position: { x: 2, y: 200 } });
      await expect(network).toBeHidden();
    });
  }
});

for (const width of [320, 390, 768, 1440]) {
  test(`metric details support hover, keyboard and touch-style activation at ${width}px`, async ({
    page,
    api,
  }, testInfo) => {
    api.setHandler((url) =>
      url.pathname === '/v3/transactions/recent'
        ? {
            data: {
              network: {
                performance: { tps: 1647.97, nonVoteTps: 1234.56 },
                fees: { averageFeeLamports: 24000 },
              },
              transactions: [],
            },
          }
        : undefined,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const header = page.getByRole('banner');
    const sol = header.getByRole('button', {
      name: 'SOL $150.25, show details',
    });
    const tps = header.getByRole('button', {
      name: 'TPS 1,647.97, show details',
    });
    const market = header.getByRole('region', { name: 'SOL market details' });
    const network = header.getByRole('region', {
      name: 'Network performance details',
    });
    await sol.hover();
    await expect(market).toBeVisible();
    await market.hover();
    await expect(market).toBeVisible();
    await expect(market).toContainText(
      'Market cap$75,000.00M24h volume$1,250.00M',
    );
    await page.getByRole('main').hover({ position: { x: 2, y: 200 } });
    await expect(market).toBeHidden();
    await sol.focus();
    await expect(market).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(market).toBeHidden();
    await expect(sol).toBeFocused();
    await sol.press('Enter');
    await expect(market).toBeVisible();
    await sol.press('Tab');
    await expect(tps).toBeFocused();
    await expect(market).toBeHidden();
    await expect(network).toContainText(
      'True TPS1,234.56Average fee0.000024 SOL',
    );
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await header
          .getByRole('button', { name: 'Toggle color theme' })
          .click();
        await expect(network).toBeHidden();
      }
      await tps.click();
      await expect(network).toBeVisible();
      const bounds = await network.boundingBox();
      if (!bounds) throw new Error('Open details need visible bounds.');
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(`navbar-hover-${width}-${theme}.png`),
      });
      await expect(
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).resolves.toBe(true);
    }
    await page.getByRole('main').click({ position: { x: 2, y: 200 } });
    await expect(network).toBeHidden();
    await tps.click();
    await page.setViewportSize({ width: width + 1, height: 900 });
    await expect(network).toBeHidden();
  });
}

for (const width of [390, 1024, 1440]) {
  for (const state of ['failed', 'empty']) {
    test(`keeps unavailable Jupiter metrics visible when market data is ${state} at ${width}px`, async ({
      page,
      api,
    }) => {
      api.setHandler((url) =>
        url.pathname === '/v3/assets'
          ? state === 'failed'
            ? {
                error: {
                  code: 'UPSTREAM_UNAVAILABLE',
                  message: 'Market data unavailable',
                },
              }
            : { data: [] }
          : undefined,
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const header = page.getByRole('banner');
      const jupiter = header.getByRole('button', {
        name: 'SOL —, show details',
      });
      await expect(jupiter).toBeVisible();
      await jupiter.click();
      const details = header.getByRole('region', {
        name: 'SOL market details',
      });
      await expect(details).toContainText('Market cap—24h volume—');
      await expect(
        header.getByRole('button', { name: /TPS .*show details/ }),
      ).toBeVisible();
      await expect(details.locator('.iris-value-skeleton')).toHaveCount(0);
      await expect(
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).resolves.toBe(true);
      expect((await header.boundingBox())?.height).toBeLessThanOrEqual(
        width <= 720 ? 61 : 49,
      );
    });
  }
}

for (const { width, fallbackFont } of [
  ...[320, 390, 720, 768, 960, 961, 1024, 1100, 1101, 1280, 1281, 1440].map(
    (width) => ({ width, fallbackFont: false }),
  ),
  ...[320, 961].map((width) => ({ width, fallbackFont: true })),
]) {
  test(`fits navigation and single-line metrics at ${width}px${fallbackFont ? ' with wider fallback font' : ''}`, async ({
    page,
    api,
  }, testInfo) => {
    api.setHandler((url) =>
      url.pathname === '/v3/transactions/recent'
        ? {
            data: {
              network: {
                performance: { tps: 1647.97, nonVoteTps: 1234.56 },
                fees: { averageFeeLamports: 24000 },
              },
              transactions: [],
            },
          }
        : undefined,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    if (fallbackFont)
      await page.addStyleTag({
        content:
          '.iris-header, .iris-header * { font-family: Verdana, sans-serif !important; }',
      });
    await expect(
      page.getByRole('heading', { name: 'Solana network', exact: true }),
    ).toBeVisible();
    const header = page.getByRole('banner');
    await expect(
      header.getByText(APP_DISPLAY_VERSION, { exact: true }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole('contentinfo')
        .getByText(APP_DISPLAY_VERSION, { exact: true }),
    ).toBeVisible();
    expect((await header.boundingBox())?.height).toBeLessThanOrEqual(
      width <= 720 ? 61 : 49,
    );
    await expect(
      header.getByRole('button', { name: 'TPS 1,647.97, show details' }),
    ).toBeVisible();
    await expect(header.getByRole('link', { name: 'API Docs' })).toHaveCount(0);
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'API Docs' }),
    ).toHaveAttribute('href', '/api-docs');
    const theme = header.getByRole('button', { name: 'Toggle color theme' });
    await expect(theme).toHaveText('');
    await expect(theme.locator('svg')).toBeVisible();
    for (const selector of [
      '.iris-metric-sol .iris-metric-trigger',
      '.iris-metric-tps .iris-metric-trigger',
    ]) {
      const group = header.locator(selector);
      await expect(group).toBeVisible();
      await expect(group).toHaveCSS('font-size', `${width <= 360 ? 11 : 12}px`);
      await expect(group).toHaveCSS('font-weight', '600');
      await expect(group).toHaveCSS('background-image', 'none');
      await expect(group).toHaveCSS('border-bottom-style', 'solid');
      await expect(group).toHaveAttribute('aria-expanded', 'false');
      expect(
        await group.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return (
            bounds.left >= 0 &&
            bounds.right <= innerWidth &&
            element.scrollWidth <= element.clientWidth &&
            element.clientHeight <= 44
          );
        }),
        JSON.stringify(
          await group.evaluate((element) => ({
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
            children: [...element.children].map((child) => ({
              width: child.clientWidth,
              scrollWidth: child.scrollWidth,
              height: child.clientHeight,
            })),
          })),
        ),
      ).toBe(true);
      await expect(group).toBeInViewport();
      const headerBounds = await header.boundingBox();
      const groupBounds = await group.boundingBox();
      if (!headerBounds || !groupBounds)
        throw new Error('Navbar metrics must have visible bounds.');
      expect(groupBounds.y).toBeGreaterThanOrEqual(headerBounds.y);
      expect(groupBounds.y + groupBounds.height).toBeLessThanOrEqual(
        headerBounds.y + headerBounds.height,
      );
    }
    if (width > 1100) {
      const search = await header.getByRole('combobox').boundingBox();
      const metrics = await header
        .locator('.iris-header-metrics')
        .boundingBox();
      const nav = await header
        .getByRole('navigation', { name: 'Main navigation', exact: true })
        .boundingBox();
      if (!search || !metrics || !nav)
        throw new Error('Desktop navigation must have visible bounds.');
      expect(
        Math.abs(search.x + search.width / 2 - width / 2),
      ).toBeLessThanOrEqual(1);
      expect(search.width).toBe(width >= 1440 ? 360 : 320);
      expect(nav.x + nav.width).toBeLessThanOrEqual(search.x);
      expect(search.x + search.width).toBeLessThanOrEqual(metrics.x);
    }
    expect(
      await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        outside: [...document.querySelectorAll('.iris-header *')]
          .filter(
            (element) => element.getBoundingClientRect().right > innerWidth,
          )
          .map((element) => ({
            className: element.className,
            right: element.getBoundingClientRect().right,
          })),
      })),
    ).toEqual({ overflow: false, outside: [] });
    await expect(page.locator('.iris-auth-pending')).toHaveCount(0);
    if (width <= 720) {
      await expect(
        header.getByRole('button', { name: 'Navigation menu' }),
      ).toBeVisible();
      await expect(
        header.getByRole('button', { name: 'Open search' }),
      ).toBeVisible();
      await expect(header.getByRole('link', { name: 'Account' })).toHaveCount(
        0,
      );
    } else {
      await expect(
        header.getByRole('link', { name: 'Log in', exact: true }),
      ).toBeVisible();
      await expect(
        header.getByRole('link', { name: 'Sign up', exact: true }),
      ).toBeVisible();
      const account = await header
        .getByRole('link', { name: 'Sign up', exact: true })
        .boundingBox();
      expect(account?.x).toBeGreaterThan(width / 2);
      await expect(
        header.getByRole('button', { name: 'Navigation menu' }),
      ).toBeHidden();
    }
    await header.screenshot({
      path: testInfo.outputPath(`navbar-${width}-light.png`),
    });
    await theme.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(header.locator('.iris-brand-mark')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await expect(header).toHaveCSS('background-color', 'rgb(9, 9, 11)');
    await header.screenshot({
      path: testInfo.outputPath(`navbar-${width}-dark.png`),
    });
    if (width === 390 || width === 1440) {
      await page.getByRole('contentinfo').screenshot({
        path: testInfo.outputPath(`footer-${width}-dark.png`),
      });
    }
  });
}

for (const width of [390, 1440]) {
  test(`primary navigation icons and selected states follow the route at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const navigation = page.getByRole('navigation', {
      name: width <= 720 ? 'Account and navigation' : 'Main navigation',
      exact: true,
    });
    if (width <= 720)
      await page.getByRole('button', { name: 'Navigation menu' }).click();
    const home = navigation.getByRole('link', { name: 'Home', exact: true });
    const watchlist = navigation.getByRole('link', {
      name: 'Watchlist',
      exact: true,
    });
    await expect(home).toHaveAttribute('aria-current', 'page');
    await expect(watchlist).not.toHaveAttribute('aria-current');
    for (const link of [home, watchlist]) {
      await expect(link.locator('svg[aria-hidden="true"]')).toBeVisible();
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(
        width <= 720 ? 44 : 36,
      );
    }
    await watchlist.click();
    await expect(page).toHaveURL('/watchlist');
    if (width <= 720)
      await page.getByRole('button', { name: 'Navigation menu' }).click();
    await expect(watchlist).toHaveAttribute('aria-current', 'page');
    await expect(home).not.toHaveAttribute('aria-current');
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.getByRole('button', { name: 'Toggle color theme' }).click();
        // Theme is outside the disclosure, so its pointer interaction closes it.
        if (width <= 720)
          await page.getByRole('button', { name: 'Navigation menu' }).click();
      }
      await expect(watchlist).toHaveCSS('font-weight', '600');
      await expect(home).not.toHaveCSS(
        'background-color',
        await watchlist.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      );
    }
  });
}

test('mobile navigation closes on Escape, outside interaction, search and route selection', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.iris-auth-pending')).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Navigation menu' });
  const menu = page.getByRole('navigation', { name: 'Account and navigation' });
  await expect(menu).toBeHidden();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.screenshot({ path: testInfo.outputPath('mobile-menu-open.png') });
  await trigger.press('Tab');
  await expect(
    menu.getByRole('link', { name: 'Home', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(menu).toBeHidden();
  await trigger.click();
  await page.getByRole('main').click({ position: { x: 4, y: 4 } });
  await expect(menu).toBeHidden();
  await trigger.click();
  await page.getByRole('button', { name: 'Open search' }).click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.getByRole('button', { name: 'Close search' }).click();
  await trigger.click();
  await menu.getByRole('link', { name: 'Sign up', exact: true }).click();
  await expect(page).toHaveURL('/account?mode=signup');
  await expect(
    page.getByRole('heading', { name: 'Create an account', exact: true }),
  ).toBeVisible();
  await expect(menu).toBeHidden();
  await trigger.click();
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(
    page.getByRole('button', { name: 'Navigation menu', includeHidden: true }),
  ).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

for (const width of [390, 1440]) {
  test(`login and signup select the correct form and support history at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.iris-auth-pending')).toHaveCount(0);
    if (width <= 720)
      await page.getByRole('button', { name: 'Navigation menu' }).click();
    await page.getByRole('link', { name: 'Sign up', exact: true }).click();
    await expect(page).toHaveURL('/account?mode=signup');
    await expect(
      page.getByRole('heading', { name: 'Create an account', exact: true }),
    ).toBeFocused();
    await page
      .getByLabel('Password', { exact: true })
      .fill('never-submit-this');
    if (width <= 720)
      await page.getByRole('button', { name: 'Navigation menu' }).click();
    await page.getByRole('link', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL('/account');
    await expect(
      page.getByRole('heading', { name: 'Sign in', exact: true }),
    ).toBeFocused();
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
    await page.goBack();
    await expect(page).toHaveURL('/account?mode=signup');
    await expect(
      page.getByRole('heading', { name: 'Create an account', exact: true }),
    ).toBeFocused();
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Create an account', exact: true }),
    ).toBeVisible();
  });
}

test('footer entry opens documentation at the top and returns to the top of Home', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(openapiUrl, (route) =>
    route.fulfill({
      contentType: 'application/yaml',
      body: 'openapi: 3.0.3\ninfo:\n  title: Navbar API\n  version: 1.0.0\npaths: {}\n',
    }),
  );
  await page.goto('/');
  const docs = page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'API Docs' });
  await docs.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await docs.click();
  await expect(page).toHaveURL('/api-docs');
  await expect(
    page.getByRole('heading', { name: 'Navbar API', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Interactive API documentation' }),
  ).toBeInViewport();
  await expect(page.evaluate(() => scrollY)).resolves.toBe(0);
  await page.getByRole('link', { name: 'Back to Iris' }).click();
  await expect(
    page.getByRole('heading', { name: 'Solana network', exact: true }),
  ).toBeInViewport();
  await expect(page.evaluate(() => scrollY)).resolves.toBe(0);
});
