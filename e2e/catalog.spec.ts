import { expect, test } from './support/test';
import { sol, walletAddress } from './support/workerMock';

test('opens catalog assets and validates public-wallet lookup input', async ({
  page,
}) => {
  await page.goto('/assets');
  await expect(
    page.getByRole('heading', { name: 'Asset catalog' }),
  ).toBeVisible();
  await page.getByRole('link', { name: /SOL Solana/ }).click();
  await expect(page).toHaveURL(`/asset/${sol.mint}`);

  await page.goto('/wallets');
  const input = page.getByRole('textbox', { name: 'Solana wallet address' });
  await input.fill('invalid');
  await expect(
    page.getByText('Enter a valid Base58 Solana address.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'View wallet' }),
  ).toBeDisabled();
  await input.fill(walletAddress);
  await page.getByRole('button', { name: 'View wallet' }).click();
  await expect(page).toHaveURL(`/wallet/${walletAddress}`);
});
