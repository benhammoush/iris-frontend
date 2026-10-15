import { expect, test } from './support/test';
import { sol } from './support/workerMock';

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
  await expect(
    page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).resolves.toBe(true);
});
