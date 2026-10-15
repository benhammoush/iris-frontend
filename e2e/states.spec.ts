import { expect, test } from './support/test';
import { sol } from './support/workerMock';

test('distinguishes an unavailable asset from an empty chart', async ({
  page,
  api,
}) => {
  api.setHandler((url) => {
    if (url.pathname.endsWith('/candles')) return { data: { candles: [] } };
    return undefined;
  });
  await page.goto(`/asset/${sol.mint}`);
  await expect(page.getByText('No price history is available.')).toBeVisible();

  api.setHandler((url) =>
    url.pathname === `/v3/assets/mint/${sol.mint}`
      ? {
          error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Asset unavailable' },
        }
      : undefined,
  );
  await page.goto(`/asset/${sol.mint}?failure=1`);
  await expect(
    page.getByText('Asset data is currently unavailable from the Worker.'),
  ).toBeVisible();
});
