import { test, expect } from './support/test';

test('email account flows use the Firebase SDK without touching live services', async ({
  page,
  browserName,
}) => {
  let verified = false;
  const operations: string[] = [];
  const unexpected: string[] = [];
  const idToken = () => {
    const now = Math.floor(Date.now() / 1000);
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
          refresh_token: 'e2e-refresh-token',
          expires_in: '3600',
          user_id: 'e2e-user',
          project_id: 'iris-e2e',
        },
      });
    unexpected.push(url.origin + url.pathname);
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Account', exact: true }).click();
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
  verified = true;
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
  expect(unexpected).toEqual([]);
});
