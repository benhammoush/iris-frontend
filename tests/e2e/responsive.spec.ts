/**
 * Regression coverage and controlled fixtures for responsive.
 * @packageDocumentation
 */

import { expect, test } from './support/test';
import { sol } from './support/workerMock';

for (const dismissal of ['Escape', 'Close search', 'Escape from Close']) {
  test(`returns mobile search focus after ${dismissal}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Open search' });
    await trigger.click();
    const search = page.getByRole('combobox');
    await expect(search).toBeFocused();
    await search.fill('SOL');
    const close = page.getByRole('button', { name: 'Close search' });
    if (dismissal === 'Close search') await close.click();
    else if (dismissal === 'Escape from Close') {
      await search.press('Tab');
      await expect(close).toBeFocused();
      await close.press('Escape');
    } else await search.press('Escape');

    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(search).not.toBeVisible();
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });
}

test('opens focused mobile search and navigates without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open search' }).click();
  const search = page.getByRole('combobox', {
    name: 'Search assets or paste a wallet address',
  });
  await expect(search).toBeFocused();
  await search.fill('SOL');
  await page.getByRole('option', { name: /SOL Solana/ }).click();
  await expect(page).toHaveURL(`/asset/${sol.mint}`);
  await expect(page.getByRole('main')).toBeFocused();
  await expect(
    page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).resolves.toBe(true);
});
