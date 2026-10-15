import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { ComponentProps } from 'react';
import NavbarSearch, { searchAssets } from './NavbarSearch';

const sol = {
  mint: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  priceUsd: 150,
};
const jupiter = {
  mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  symbol: 'JUP',
  name: 'Jupiter',
  priceUsd: 1,
};
const jupiterPerps = {
  mint: 'JUPP1111111111111111111111111111111111111',
  symbol: 'JUPP',
  name: 'Jupiter Perps',
  priceUsd: 2,
};

function renderSearch(
  props: Partial<ComponentProps<typeof NavbarSearch>> = {},
) {
  const navigate = vi.fn();
  render(
    <NavbarSearch
      assets={[sol, jupiter, jupiterPerps]}
      loading={false}
      error={null}
      navigate={navigate}
      mobileOpen={false}
      setMobileOpen={vi.fn()}
      {...props}
    />,
  );
  return { navigate };
}

test('ranks exact, prefix, then substring matches while preserving mint case sensitivity', () => {
  expect(
    searchAssets([jupiterPerps, jupiter, sol], 'jup').map(
      (asset) => asset.symbol,
    ),
  ).toEqual(['JUP', 'JUPP']);
  expect(searchAssets([jupiter], 'JUP').map((asset) => asset.symbol)).toEqual([
    'JUP',
  ]);
  expect(searchAssets([jupiter], jupiter.mint.toLowerCase())).toEqual([]);
});

test('exposes keyboard-selectable catalog results and clears the query after selection', async () => {
  const user = userEvent.setup();
  const { navigate } = renderSearch();
  const input = screen.getByRole('combobox');

  await user.type(input, 'jup');
  expect(screen.getByRole('listbox')).toBeInTheDocument();
  expect(
    screen.getByRole('option', { name: /JUP Jupiter/i }),
  ).toBeInTheDocument();

  await user.keyboard('{ArrowDown}{Enter}');
  expect(navigate).toHaveBeenCalledWith(`/asset/${jupiter.mint}`);
  expect(input).toHaveValue('');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('updates combobox state and dismisses results with Escape or outside interaction', async () => {
  const user = userEvent.setup();
  render(
    <>
      <NavbarSearch
        assets={[sol]}
        loading={false}
        error={null}
        navigate={vi.fn()}
        mobileOpen={false}
        setMobileOpen={vi.fn()}
      />
      <button type="button">Outside</button>
    </>,
  );
  const input = screen.getByRole('combobox');

  await user.type(input, 'sol');
  expect(input).toHaveAttribute('aria-expanded', 'true');
  await user.keyboard('{ArrowDown}');
  expect(input).toHaveAttribute(
    'aria-activedescendant',
    expect.stringContaining('asset-'),
  );
  expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  await user.keyboard('{Escape}');
  expect(input).toHaveAttribute('aria-expanded', 'false');

  await user.click(input);
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('keeps public-address actions available and suppresses duplicate token-mint lookups', async () => {
  const user = userEvent.setup();
  renderSearch({ assets: [sol] });
  const input = screen.getByRole('combobox');

  await user.type(input, sol.mint);
  expect(
    screen.getByRole('option', { name: /SOL Solana/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('option', { name: /View public wallet/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('option', { name: /View token mint/i }),
  ).not.toBeInTheDocument();
});

test('reports loading, error, and empty search states without disabled result buttons', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <NavbarSearch
      assets={[]}
      loading
      error={null}
      navigate={vi.fn()}
      mobileOpen={false}
      setMobileOpen={vi.fn()}
    />,
  );
  const input = screen.getByRole('combobox');

  await user.type(input, 'missing');
  expect(screen.getByRole('listbox')).toHaveTextContent('Loading assets...');
  rerender(
    <NavbarSearch
      assets={[]}
      loading={false}
      error={new Error('unavailable')}
      navigate={vi.fn()}
      mobileOpen={false}
      setMobileOpen={vi.fn()}
    />,
  );
  expect(screen.getByRole('listbox')).toHaveTextContent(
    'Asset search is unavailable',
  );
  rerender(
    <NavbarSearch
      assets={[]}
      loading={false}
      error={null}
      navigate={vi.fn()}
      mobileOpen={false}
      setMobileOpen={vi.fn()}
    />,
  );
  expect(screen.getByRole('listbox')).toHaveTextContent(
    'No matching loaded assets.',
  );
  expect(
    screen.queryByRole('button', { name: /No matching/i }),
  ).not.toBeInTheDocument();
});
