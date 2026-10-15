import { expect, test } from './support/test';
import { sol, walletAddress } from './support/workerMock';

test('selects asset results with the keyboard and closes with Escape', async ({
  page,
}) => {
  await page.goto('/');
  const search = page.getByRole('combobox', {
    name: 'Search assets or paste a wallet address',
  });
  await search.fill('SOL');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page).toHaveURL(`/asset/${sol.mint}`);

  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Market overview' }),
  ).toBeVisible();
  await search.click();
  await search.fill('not-found');
  await expect(
    page.getByRole('status').filter({ hasText: 'No matching loaded assets.' }),
  ).toHaveText('No matching loaded assets.');
  await search.press('Escape');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
});

test('offers the explicit public-wallet action for a valid address', async ({
  page,
}) => {
  await page.goto('/');
  const search = page.getByRole('combobox', {
    name: 'Search assets or paste a wallet address',
  });
  await search.fill(walletAddress);
  await page.getByRole('option', { name: /View public wallet/ }).click();
  await expect(page).toHaveURL(`/wallet/${walletAddress}`);
  await expect(
    page.getByRole('heading', { name: 'Treasury Wallet' }),
  ).toBeVisible();
});
