import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import HeliusNetworkCard from './HeliusNetworkCard';

test('keeps row and animation classes separate for new and existing signatures', () => {
  const props = {
    network: null,
    loading: false,
    error: null,
    transactionsLoading: false,
    transactionsError: null,
  };
  const previous = { signature: 'previous-signature' };
  const { rerender } = render(
    <HeliusNetworkCard {...props} transactions={[previous]} />,
  );
  const previousRow = () => screen.getByRole('row', { name: /previous/ });
  expect(previousRow()).toHaveClass('iris-recent-transaction-row');
  expect(previousRow()).not.toHaveClass('is-new');

  rerender(
    <HeliusNetworkCard
      {...props}
      transactions={[previous, { signature: 'new-signature' }]}
    />,
  );
  expect(previousRow()).toHaveClass('iris-recent-transaction-row');
  expect(previousRow()).not.toHaveClass('is-new');
  expect(screen.getByRole('row', { name: /new-sign/ })).toHaveClass(
    'iris-recent-transaction-row',
    'is-new',
  );
});
