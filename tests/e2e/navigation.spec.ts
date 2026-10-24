/**
 * Regression coverage and controlled fixtures for navigation.
 * @packageDocumentation
 */

import { expect, test } from './support/test';
import { sol } from './support/workerMock';

test('supports browser history, direct asset links, and unknown routes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /SOL/i }).first().click();
  await expect(page).toHaveURL(`/asset/${sol.mint}`);

  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Market overview' }),
  ).toBeVisible();

  await page.goto(`/asset/${sol.mint}`);
  await expect(page.getByRole('heading', { name: /Solana SOL/ })).toBeVisible();

  await page.goto('/missing-route');
  await expect(
    page.getByText('Asset or wallet address not found.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Market overview' }),
  ).toBeVisible();
});
