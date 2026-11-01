/**
 * Regression coverage and controlled fixtures for account.
 * @packageDocumentation
 */

import { test, expect } from './support/test';
import type { Page } from '@playwright/test';
import { sol, walletAddress } from './support/workerMock';

test('a restored Google session shows its provider without password setup', async ({
  page,
  browserName,
}) => {
  const now = Math.floor(Date.now() / 1000);
  const token = [
    { alg: 'RS256', kid: 'e2e-only' },
    {
      sub: 'e2e-google',
      aud: 'iris-e2e',
      iss: 'https://securetoken.google.com/iris-e2e',
      email: 'google@example.test',
      email_verified: true,
      iat: now,
      auth_time: now,
      exp: now + 3600,
      firebase: { sign_in_provider: 'google.com' },
    },
  ]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .join('.');
  const provider = {
    providerId: 'google.com',
    uid: 'e2e-google',
    displayName: 'Google test user',
    email: 'google@example.test',
    photoURL: null,
  };
  await page.addInitScript(
    (user) =>
      localStorage.setItem(
        'firebase:authUser:iris-e2e-public-key:iris-accounts',
        JSON.stringify(user),
      ),
    {
      uid: 'e2e-google',
      email: 'google@example.test',
      emailVerified: true,
      isAnonymous: false,
      providerData: [provider],
      stsTokenManager: {
        refreshToken: 'e2e-google-refresh',
        accessToken: `${token}.test-signature`,
        expirationTime: (now + 3600) * 1000,
      },
      createdAt: '1',
      lastLoginAt: '1',
      apiKey: 'iris-e2e-public-key',
      appName: 'iris-accounts',
    },
  );
  const unexpected: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.origin === 'https://iris.test')
      return route.fallback();
    if (
      url.origin === 'https://identitytoolkit.googleapis.com' &&
      url.pathname.endsWith('/accounts:lookup')
    )
      return route.fulfill({
        json: {
          users: [
            {
              localId: 'e2e-google',
              email: 'google@example.test',
              emailVerified: true,
              providerUserInfo: [
                { ...provider, rawId: provider.uid, federatedId: provider.uid },
              ],
              createdAt: '1',
              lastLoginAt: '1',
            },
          ],
        },
      });
    unexpected.push(url.origin + url.pathname);
    return route.abort();
  });
  await page.goto('/account');
  await expect(page.getByText('Signed in with Google.')).toBeVisible();
  await expect(page.getByText('Email verified.')).toBeVisible();
  await expect(page.getByLabel('New password')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Add email and password' }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Delete my account' }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/google-provider-summary-${browserName}.png`,
  });
  const header = page.getByRole('banner');
  const accountMenu = header.getByRole('button', {
    name: 'Account menu',
    exact: true,
  });
  await expect(accountMenu).toBeVisible();
  await expect(
    header.getByRole('link', { name: 'Log in', exact: true }),
  ).toHaveCount(0);
  await expect(
    header.getByRole('link', { name: 'Sign up', exact: true }),
  ).toHaveCount(0);
  await accountMenu.click();
  const navigation = page.getByRole('navigation', {
    name: 'Account and navigation',
  });
  await expect(
    navigation.getByRole('link', { name: 'Account', exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Home', exact: true }),
  ).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(accountMenu).toBeFocused();
  await header.screenshot({
    path: `test-results/navbar-signed-in-${browserName}.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await header.getByRole('button', { name: 'Toggle color theme' }).click();
  await header.getByRole('button', { name: 'Navigation menu' }).click();
  await expect(
    navigation.getByRole('link', { name: 'Account', exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Sign up', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `test-results/navbar-signed-in-mobile-${browserName}.png`,
  });
  await navigation
    .getByRole('button', { name: 'Sign out', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    header.getByRole('link', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole('link', { name: 'Sign up', exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole('button', { name: 'Account menu' }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

/** Install isolated provider and private-API responses without contacting live accounts.
 * @param page - Fresh test page owning all request interception.
 * @param initiallyVerified - Whether this journey starts with a verified email identity.
 * @returns Mutable fixture controls and request evidence scoped to this page.
 */
async function installEmailAccountMock(page: Page, initiallyVerified = false) {
  let verified = initiallyVerified;
  const operations: string[] = [];
  const unexpected: string[] = [];
  /** Build the browser-test identity token for the isolated authentication fixture.
   * @returns A synthetic token accepted only by intercepted provider responses.
   */
  const idToken = () => {
    const now = Math.floor(Date.now() / 1000);
    /** Encode one controlled token segment for the authentication fixture.
     * @param value - Controlled header or claims object.
     * @returns Its base64url-encoded JSON representation.
     */
    const part = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${part({ alg: 'RS256', kid: 'e2e-only' })}.${part({ sub: 'e2e-user', user_id: 'e2e-user', aud: 'iris-e2e', iss: 'https://securetoken.google.com/iris-e2e', email: 'test@example.test', email_verified: verified, iat: now, auth_time: now, exp: now + 3600 })}.test-signature`;
  };
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.origin === 'https://iris.test')
      return route.fallback();
    if (url.origin === 'https://identitytoolkit.googleapis.com') {
      const operation = url.pathname.split(':')[1];
      operations.push(operation);
      if (['signUp', 'signInWithPassword'].includes(operation))
        return route.fulfill({
          json: {
            localId: 'e2e-user',
            email: 'test@example.test',
            displayName: '',
            idToken: idToken(),
            refreshToken: 'e2e-refresh-token',
            expiresIn: '3600',
            registered: true,
          },
        });
      if (operation === 'lookup')
        return route.fulfill({
          json: {
            users: [
              {
                localId: 'e2e-user',
                email: 'test@example.test',
                emailVerified: verified,
                providerUserInfo: [
                  {
                    providerId: 'password',
                    email: 'test@example.test',
                    federatedId: 'test@example.test',
                    rawId: 'test@example.test',
                  },
                ],
                createdAt: '1',
                lastLoginAt: '1',
              },
            ],
          },
        });
      if (operation === 'sendOobCode')
        return route.fulfill({ json: { email: 'test@example.test' } });
    }
    if (
      url.origin === 'https://securetoken.googleapis.com' &&
      url.pathname === '/v1/token'
    )
      return route.fulfill({
        json: {
          id_token: idToken(),
          // The installed Web SDK consumes access_token from the STS response.
          access_token: idToken(),
          refresh_token: 'e2e-refresh-token',
          expires_in: '3600',
          user_id: 'e2e-user',
          project_id: 'iris-e2e',
        },
      });
    unexpected.push(url.origin + url.pathname);
    return route.abort();
  });
  const savedAt = '2026-10-22T08:00:00.000Z';
  const saved: {
    assets: { address: string; savedAt: string }[];
    wallets: { address: string; savedAt: string }[];
  } = { assets: [], wallets: [] };
  const privateOperations: string[] = [];
  let limitNextSave = false;
  let deletionAccepted = false;
  await page.route('https://iris.test/v3/me/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/v3/me/account/deletion') {
      expect(request.headers().authorization).toBe(
        'Deletion e2e-status-receipt',
      );
      expect(request.headers().cookie).toBeUndefined();
      return route.fulfill({
        json: {
          data: { status: 'deleted' },
          meta: { requestId: 'deletion-status-e2e' },
        },
      });
    }
    expect(request.headers().authorization).toMatch(/^Bearer /);
    expect(request.headers().cookie).toBeUndefined();
    const method = request.method();
    privateOperations.push(method);
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (path === '/v3/me/account') {
      expect(method).toBe('DELETE');
      expect(request.headers()['x-iris-confirm-deletion']).toBe('permanent');
      expect(request.postData()).toBeNull();
      deletionAccepted = true;
      saved.assets = [];
      saved.wallets = [];
      return route.fulfill({
        status: 202,
        headers,
        json: {
          data: {
            status: 'deleting',
            receipt: 'e2e-status-receipt',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
          meta: { requestId: 'deletion-e2e' },
        },
      });
    }
    if (method === 'GET')
      return route.fulfill({
        headers,
        json: { data: saved, meta: { requestId: 'private-e2e' } },
      });
    const [, kind, address] =
      new URL(request.url()).pathname.match(
        /watchlist\/(asset|wallet)\/(.+)$/,
      ) ?? [];
    const section = kind === 'asset' ? 'assets' : 'wallets';
    if (method === 'PUT') {
      if (limitNextSave) {
        limitNextSave = false;
        return route.fulfill({
          status: 409,
          headers,
          json: {
            error: {
              code: 'WATCHLIST_LIMIT_REACHED',
              message: 'limit',
              requestId: 'private-e2e',
            },
          },
        });
      }
      const item = saved[section].find((item) => item.address === address) ?? {
        address,
        savedAt,
      };
      if (!saved[section].includes(item)) saved[section].push(item);
      return route.fulfill({
        headers,
        json: { data: { kind, ...item }, meta: { requestId: 'private-e2e' } },
      });
    }
    saved[section] = saved[section].filter((item) => item.address !== address);
    return route.fulfill({
      headers,
      json: { data: { removed: true }, meta: { requestId: 'private-e2e' } },
    });
  });
  return {
    operations,
    unexpected,
    saved,
    savedAt,
    privateOperations,
    /** Publish verification through the next mocked provider response. */
    verifyEmail() {
      verified = true;
    },
    /** Reject only the next attempted watchlist save with the existing limit response. */
    limitNextSave() {
      limitNextSave = true;
    },
    /** Observe whether the controlled Worker accepted permanent deletion.
     * @returns Whether the deletion endpoint accepted the request.
     */
    get deletionAccepted() {
      return deletionAccepted;
    },
  };
}

/** Sign in through the real email form against this test's intercepted provider.
 * @param page - Fresh page whose isolated account responses are already installed.
 */
async function signInEmail(page: Page) {
  await page.goto('/account');
  await page.getByLabel('Email address').fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password123');
  await page.getByRole('button', { name: 'Sign in with email' }).click();
  await expect(
    page.getByRole('heading', { name: 'Signed in', exact: true }),
  ).toBeVisible();
}

test('email signup, verification, restoration and reset use the Firebase SDK without live services', async ({
  page,
  browserName,
}) => {
  const account = await installEmailAccountMock(page);
  const { operations, unexpected, privateOperations } = account;
  await page.goto(`/asset/${sol.mint}`);
  await expect(
    page.getByRole('link', { name: 'Sign in to save to watchlist' }),
  ).toBeVisible();
  expect(privateOperations).toEqual([]);
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.getElementById('iris-main')?.contains(document.activeElement),
      ),
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  await page.getByLabel('Email address').fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password123');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByText('Verify your email before using private watchlists.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resend verification email' }).click();
  account.verifyEmail();
  await page.getByRole('button', { name: 'I have verified my email' }).click();
  await expect(page.getByText('Email verified.')).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('test@example.test', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email address').fill('test@example.test');
  await page.getByRole('button', { name: 'Send reset instructions' }).click();
  await expect(
    page.locator('.iris-account-feedback [role="status"]'),
  ).toContainText('If this email can receive');
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await page.getByLabel('Email address').fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password123');
  await page.getByRole('button', { name: 'Sign in with email' }).click();
  await expect(
    page.getByRole('heading', { name: 'Signed in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('button', { name: 'Sign out', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/account-${browserName}-mobile-dark.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(operations).toContain('signInWithPassword');
  expect(operations).toContain('signUp');
  expect(privateOperations.filter((method) => method !== 'GET')).toEqual([]);
  expect(unexpected).toEqual([]);
});

test('private watchlists preserve save limits, recovery, sequential loading and sign-out isolation', async ({
  page,
  browserName,
  api,
}) => {
  const account = await installEmailAccountMock(page, true);
  const { saved, savedAt, unexpected } = account;
  await signInEmail(page);
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/asset/${sol.mint}`);
  await expect(
    page.getByRole('button', { name: 'Save to watchlist', exact: true }),
  ).toBeEnabled();
  account.limitNextSave();
  await page
    .getByRole('button', { name: 'Save to watchlist', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('at most 100');
  await expect(
    page.getByRole('button', { name: 'Save to watchlist', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('button', { name: 'Save to watchlist', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Remove from watchlist', exact: true }),
  ).toBeEnabled();
  await page.getByRole('link', { name: 'View watchlist' }).click();
  await expect(
    page.getByRole('link', { name: `Solana · SOL ${sol.mint}` }),
  ).toBeVisible();
  const unknownAddress = '11111111111111111111111111111111';
  saved.assets.push({
    address: unknownAddress,
    savedAt: '2026-10-23T08:00:00.000Z',
  });
  saved.wallets.push({ address: walletAddress, savedAt });
  /** Collect wallet requests observed by the browser fixture.
   * @returns The number of public wallet-resource requests observed so far.
   */
  const walletCalls = () =>
    api.requests.filter((url) => url.pathname.startsWith('/v3/wallets/'))
      .length;
  const beforeWalletCalls = walletCalls();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    page.getByRole('link', { name: unknownAddress, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: walletAddress, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Wallets' }).getByText('Priced subtotal'),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Wallets' }).getByText('$1,234.56'),
  ).toBeVisible();
  expect(walletCalls()).toBeGreaterThan(beforeWalletCalls);
  await expect(
    page
      .getByRole('region', { name: 'Wallets' })
      .locator(
        '.iris-watchlist-table time[datetime="2026-10-22T08:00:00.000Z"]',
      ),
  ).toHaveCount(1);
  expect(
    api.requests.filter(
      (url) => url.pathname === `/v3/wallets/${walletAddress}/transactions`,
    ),
  ).toHaveLength(0);
  await expect(page.getByRole('region', { name: 'Wallets' })).not.toContainText(
    'Volume',
  );
  expect(
    await page
      .locator('.iris-watchlist-table')
      .first()
      .locator('tbody tr a')
      .first()
      .getAttribute('href'),
  ).toBe(`/asset/${unknownAddress}`);
  await page.screenshot({
    path: `test-results/watchlist-${browserName}-mobile-dark.png`,
    fullPage: true,
  });
  for (const row of await page
    .locator('.iris-watchlist-table tbody tr')
    .all()) {
    expect((await row.boundingBox())?.height).toBeLessThanOrEqual(80);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `test-results/watchlist-${browserName}-desktop-light.png`,
    fullPage: true,
  });
  api.setHandler((url) =>
    url.pathname === `/v3/wallets/${walletAddress}`
      ? {
          status: 503,
          error: { code: 'WALLET_LOOKUP_UNAVAILABLE', message: 'Unavailable' },
        }
      : undefined,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const wallets = page.getByRole('region', { name: 'Wallets' });
  await expect(wallets.getByText('Stale', { exact: true })).toBeVisible();
  await expect(wallets.getByText('$1,234.56')).toBeVisible();
  await expect(
    wallets.getByRole('button', { name: 'Retry wallet summary' }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `test-results/watchlist-${browserName}-stale-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  api.setHandler(() => undefined);
  await wallets.getByRole('button', { name: 'Retry wallet summary' }).click();
  await expect(wallets.getByText('Stale', { exact: true })).toHaveCount(0);
  await expect(wallets.getByText('$1,234.56')).toBeVisible();
  saved.wallets.push({
    address: unknownAddress,
    savedAt: '2026-10-21T08:00:00.000Z',
  });
  api.setHandler((url) =>
    url.pathname === `/v3/wallets/${unknownAddress}`
      ? {
          data: {
            address: unknownAddress,
            balances: [],
            valuation: { pricedSubtotalUsd: 0, complete: true },
          },
        }
      : undefined,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    wallets.getByRole('link', { name: unknownAddress, exact: true }),
  ).toBeVisible();
  await expect(wallets.getByText('Loading…', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Refresh watchlist', exact: true }),
  ).toBeEnabled();
  const sequentialRequests: string[] = [];
  /** Release the controlled first wallet response after checking queued loading. */
  let releaseWallet: () => void = () => {};
  const firstWalletReady = new Promise<void>((resolve) => {
    releaseWallet = resolve;
  });
  const walletRoute = 'https://iris.test/v3/wallets/*';
  await page.route(walletRoute, async (route) => {
    const address = new URL(route.request().url()).pathname.split('/').pop();
    sequentialRequests.push(address ?? '');
    expect(route.request().headers().authorization).toBeUndefined();
    await firstWalletReady;
    return route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: {
        data: {
          address,
          balances: [
            { mint: sol.mint, amount: '1', priceUsd: null, valueUsd: null },
          ],
          valuation: { pricedSubtotalUsd: 0, complete: false },
        },
        meta: {
          requestId: 'sequential-partial',
          providerStop: { provider: 'jupiter', reason: 'throttled' },
        },
      },
    });
  });
  try {
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      wallets.getByRole('link', { name: unknownAddress, exact: true }),
    ).toBeVisible();
    await expect.poll(() => sequentialRequests.length).toBe(1);
    expect(sequentialRequests).toEqual([walletAddress]);
    await expect(
      page.getByRole('button', { name: 'Refresh watchlist', exact: true }),
    ).toBeDisabled();
    releaseWallet();
    await expect(wallets.getByRole('alert')).toContainText(
      'Wallet summaries are temporarily unavailable. Retry later.',
    );
    await expect(wallets.getByText('Partial', { exact: true })).toBeVisible();
    await expect(wallets.getByText('Loading…', { exact: true })).toHaveCount(0);
    expect(sequentialRequests).toEqual([walletAddress]);
  } finally {
    releaseWallet();
    await page.unroute(walletRoute);
    saved.wallets = saved.wallets.filter(
      ({ address }) => address !== unknownAddress,
    );
  }
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    wallets.getByRole('link', { name: unknownAddress, exact: true }),
  ).toHaveCount(0);
  await expect(wallets.getByText('$1,234.56')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Refresh watchlist', exact: true }),
  ).toBeEnabled();
  api.setHandler(() => undefined);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole('button', { name: `Remove ${sol.mint} from assets` })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Assets', exact: true }),
  ).toBeFocused();
  await expect(
    page
      .locator('.iris-watchlist-table')
      .first()
      .getByRole('link', { name: new RegExp(sol.mint) }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Account and navigation' })
    .getByRole('link', { name: 'Account', exact: true })
    .click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('link', { name: 'Watchlist', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: unknownAddress, exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test('permanent account deletion requires reauthentication and retains its completion receipt', async ({
  page,
  browserName,
}) => {
  const account = await installEmailAccountMock(page, true);
  const { saved, savedAt, operations, unexpected } = account;
  saved.assets.push({ address: sol.mint, savedAt });
  saved.wallets.push({ address: walletAddress, savedAt });
  await signInEmail(page);
  const signInsBeforeDeletion = operations.filter(
    (operation) => operation === 'signInWithPassword',
  ).length;
  await page.getByRole('button', { name: 'Delete my account' }).click();
  const confirmation = page.getByLabel('Type DELETE to confirm');
  await expect(confirmation).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Confirm permanent deletion' }),
  ).toBeDisabled();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'dark')
    await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `test-results/deletion-${browserName}-mobile-dark.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await page.screenshot({
    path: `test-results/deletion-${browserName}-desktop-light.png`,
    fullPage: true,
  });
  await confirmation.fill('DELETE');
  await page
    .getByLabel('Password for account deletion')
    .fill('test-password123');
  await page
    .getByRole('button', { name: 'Confirm permanent deletion' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Account deletion underway' }),
  ).toBeFocused();
  expect(account.deletionAccepted).toBe(true);
  expect(
    operations.filter((operation) => operation === 'signInWithPassword'),
  ).toHaveLength(signInsBeforeDeletion + 1);
  expect(saved).toEqual({ assets: [], wallets: [] });
  await page.getByRole('link', { name: 'Continue public browsing' }).click();
  await page.getByRole('link', { name: 'Account', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Account deletion underway' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Check deletion status' }).click();
  await expect(
    page.getByRole('heading', { name: 'Account deletion confirmed' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Return to sign in or create an account' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeFocused();
  expect(unexpected).toEqual([]);
});
