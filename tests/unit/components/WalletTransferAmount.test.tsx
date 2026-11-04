/**
 * Exact decimal conversion and accessible wallet amount details.
 * @packageDocumentation
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import WalletTransferAmount, {
  transferQuantity,
} from '../../../src/components/WalletTransferAmount';

test.each([
  ['1488440', 6, '1.48844'],
  ['18446744073709551615', 9, '18446744073.709551615'],
  ['1', 9, '0.000000001'],
  ['0', 9, '0'],
  ['0001000', 3, '1'],
  ['123', 0, '123'],
  ['1000000000000000001', 18, '1.000000000000000001'],
  ['1', 255, `0.${'0'.repeat(254)}1`],
])(
  'converts %s with %s decimals without rounding',
  (amount, decimals, expected) => {
    expect(transferQuantity(amount, decimals)).toBe(expected);
  },
);

test.each([
  ['1', undefined],
  ['1', -1],
  ['1', 1.5],
  ['1', 256],
  ['1', NaN],
  ['1.2', 6],
  ['-1', 6],
  ['1e9', 6],
  ['', 6],
  ['abc', 6],
])('does not invent a quantity for %s with %s decimals', (amount, decimals) => {
  expect(transferQuantity(amount, decimals)).toBeNull();
});

test('opens exact source details and closes them through native dialog methods', async () => {
  const { container } = render(
    <WalletTransferAmount amount="18446744073709551615" decimals={9} />,
  );
  const dialog = container.querySelector('dialog');
  if (!dialog) throw new Error('Missing amount dialog');
  dialog.showModal = vi.fn(() => {
    dialog.open = true;
  });
  dialog.close = vi.fn(() => {
    dialog.open = false;
    dialog.dispatchEvent(new Event('close'));
  });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', {
      name: 'Show exact transfer amount: 18446744073.709551615',
    }),
  );
  const details = screen.getByRole('dialog', { name: 'Exact transfer amount' });
  expect(
    within(details).getByText('18446744073709551615', { exact: true }),
  ).toBeVisible();
  expect(
    within(details).getByText('18446744073.709551615', { exact: true }),
  ).toBeVisible();
  await userEvent.click(within(details).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', {
      name: 'Show exact transfer amount: 18446744073.709551615',
    }),
  ).toHaveFocus();
});

test('labels unknown-decimal amounts as atomic units and absent amounts as unavailable', () => {
  const { rerender } = render(<WalletTransferAmount amount="123" />);
  expect(
    screen.getByRole('button', {
      name: 'Show exact transfer amount: 123 atomic units',
    }),
  ).toHaveTextContent('123 atomic units');
  rerender(<WalletTransferAmount amount={null} decimals={9} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText('—')).toBeInTheDocument();
});
