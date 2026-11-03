/**
 * Centered Studio login, signup and recovery forms without a secondary colored panel.
 * @packageDocumentation
 */
import { expect, test } from './support/test';

for (const width of [320, 390, 768, 1440]) {
  for (const mode of ['signin', 'signup', 'reset']) {
    test(`centered ${mode} remains accessible in both themes at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(mode === 'signin' ? '/account' : `/account?mode=${mode}`);
      const title =
        mode === 'signin'
          ? 'Sign in'
          : mode === 'signup'
            ? 'Create an account'
            : 'Reset password';
      const heading = page.getByRole('heading', { name: title, exact: true });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveJSProperty('tagName', 'H1');
      const form = page.getByRole('region', { name: 'Account access' });
      const email = page.getByLabel('Email address', { exact: true });
      await expect(email).toHaveAttribute('autocomplete', 'email');
      await expect(email).toHaveAttribute('type', 'email');
      await expect(email).toHaveAttribute('required', '');
      if (mode === 'reset') {
        await expect(page.getByLabel('Password', { exact: true })).toHaveCount(
          0,
        );
        await expect(
          page.getByRole('button', {
            name: 'Continue with Google',
            exact: true,
          }),
        ).toHaveCount(0);
      } else {
        const password = page.getByLabel('Password', { exact: true });
        await expect(password).toHaveAttribute('type', 'password');
        await expect(password).toHaveAttribute(
          'autocomplete',
          mode === 'signup' ? 'new-password' : 'current-password',
        );
        await expect(
          page.getByRole('button', {
            name: 'Continue with Google',
            exact: true,
          }),
        ).toBeVisible();
      }
      await expect(page.locator('.iris-account-access aside')).toHaveCount(0);
      await expect(page.getByText('Public browsing stays public.')).toHaveCount(
        0,
      );
      await expect(
        page.getByText(/Sign-in stays active on this browser/),
      ).toHaveCount(0);
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark')
          await page
            .getByRole('button', { name: 'Toggle color theme' })
            .click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(form).toHaveCSS(
          'background-color',
          theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(24, 20, 30)',
        );
        const box = await form.boundingBox();
        if (!box) throw new Error('Missing account access layout');
        const clientWidth = await page.evaluate(
          () => document.documentElement.clientWidth,
        );
        expect(
          Math.abs(box.x + box.width / 2 - clientWidth / 2),
        ).toBeLessThanOrEqual(1);
        expect(box.width).toBeLessThanOrEqual(360);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await email.focus();
        await expect(email).toBeFocused();
        await page.screenshot({
          path: testInfo.outputPath(`account-${mode}-${width}-${theme}.png`),
          fullPage: true,
        });
      }
    });
  }
}
