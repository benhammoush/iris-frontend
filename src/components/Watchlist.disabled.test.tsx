import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import SaveControl from './SaveControl';
import Watchlist from './Watchlist';

vi.mock('../auth/config', () => ({
  accountsEnabled: false,
  accountsConfigured: false,
}));
vi.mock('./Navbar', () => ({ default: () => <nav>Public navigation</nav> }));

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
