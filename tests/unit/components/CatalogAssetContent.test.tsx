/**
 * Regression coverage and controlled fixtures for catalog asset content.
 * @packageDocumentation
 */

import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { assetsFrom } from '../../../src/data/normalizers';
import CatalogAssetContent from '../../../src/components/CatalogAssetContent';
import CatalogPanel from '../../../src/components/CatalogPanel';

test('shared catalog presentation preserves unknown metrics and unverified labels without fetching', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  const asset = assetsFrom([
    {
      mint: 'So11111111111111111111111111111111111111112',
      name: 'Solana',
      symbol: 'SOL',
      priceUsd: null,
      change24hPct: null,
      verification: { isVerified: false },
    },
  ])[0];
  render(
    <CatalogPanel title="Assets" tone="volume" count="1 / 100" id="assets">
      <div className="iris-catalog-list-rows">
        <button>
          <CatalogAssetContent asset={asset} />
        </button>
      </div>
    </CatalogPanel>,
  );
  expect(screen.getByRole('region', { name: 'Assets' })).toBeVisible();
  expect(screen.getByText('SOL')).toBeVisible();
  expect(screen.getByText('Unverified')).toBeVisible();
  expect(screen.getByText('Volume —')).toBeVisible();
  expect(screen.queryByText('$0')).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
