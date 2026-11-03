/** Keyboard, pointer and loading behavior of compact navbar disclosures.
 * @packageDocumentation
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NavbarMetrics from '../../../src/components/NavbarMetrics';

/** Render isolated formatted metrics without provider or routing side effects.
 * @returns User interaction controls.
 */
function setup() {
  render(
    <>
      <NavbarMetrics
        marketLoading={false}
        networkLoading={false}
        price="$150.25"
        marketCap="$75,000.00M"
        volume="$1,250.00M"
        tps="1,647.97"
        trueTps="1,234.56"
        fee="0.000024 SOL"
      />
      <button>Outside</button>
    </>,
  );
  return userEvent.setup();
}

test('focus opens details, switches groups and Escape dismisses without losing focus', async () => {
  const user = setup();
  await user.tab();
  const sol = screen.getByRole('button', { name: /SOL .*show details/ });
  expect(sol).toHaveFocus();
  expect(
    screen.getByRole('region', { name: 'SOL market details' }),
  ).toHaveTextContent('Market cap$75,000.00M24h volume$1,250.00M');
  await user.keyboard('{Escape}');
  expect(sol).toHaveFocus();
  expect(sol).toHaveAttribute('aria-expanded', 'false');
  await user.keyboard('{Enter}');
  expect(sol).toHaveAttribute('aria-expanded', 'true');
  await user.tab();
  expect(
    screen.queryByRole('region', { name: 'SOL market details' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('region', { name: 'Network performance details' }),
  ).toHaveTextContent('True TPS1,234.56Average fee0.000024 SOL');
  await user.tab();
  expect(
    screen.queryByRole('region', { name: 'Network performance details' }),
  ).not.toBeInTheDocument();
});

test('touch activation, outside pointer and viewport changes dismiss details', async () => {
  const user = setup();
  const sol = screen.getByRole('button', { name: /SOL .*show details/ });
  await user.click(sol);
  expect(sol).toHaveAttribute('aria-expanded', 'true');
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(sol).toHaveAttribute('aria-expanded', 'false');
  await user.click(sol);
  fireEvent(window, new Event('resize'));
  expect(sol).toHaveAttribute('aria-expanded', 'false');
});
