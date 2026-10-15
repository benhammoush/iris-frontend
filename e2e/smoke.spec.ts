import { expect, test } from './support/test';
import { sol } from './support/workerMock';

test('opens the dashboard and navigates to a catalog asset', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Market overview' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /SOL/i }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: /SOL/i }).first().click();
  await expect(page).toHaveURL(`/asset/${sol.mint}`);
  await expect(page.getByRole('heading', { name: /Solana SOL/ })).toBeVisible();
});
