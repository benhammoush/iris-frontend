/**
 * Regression coverage and controlled fixtures for watchlist disabled.
 * @packageDocumentation
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import SaveControl from '../../../src/components/SaveControl';
import Watchlist from '../../../src/components/Watchlist';

vi.mock('../../../src/auth/config', () => ({
  accountsEnabled: false,
  accountsConfigured: false,
}));
vi.mock('../../../src/components/Navbar', () => ({
  /** Render the minimal navigation substitute used to isolate this component test.
   * @returns A public navigation landmark.
   */
  default: () => <nav>Public navigation</nav>,
}));

test('disabled builds hide save controls and explain direct watchlist links without private reads', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  render(
    <MemoryRouter>
      <SaveControl
        kind="asset"
        address="So11111111111111111111111111111111111111112"
      />
      <Watchlist />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole('button', { name: /watchlist/i }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Watchlists are not enabled/)).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
