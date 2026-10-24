import { fireEvent, render, screen } from '@testing-library/react';
import AssetIcon from '../../../src/components/AssetIcon';

test('keeps missing and failed provider icons readable', () => {
  const { rerender } = render(<AssetIcon symbol="SOL" alt="Solana icon" />);
  expect(screen.getByLabelText('Solana icon')).toHaveTextContent('SO');

  rerender(<AssetIcon src="/broken.png" symbol="SOL" alt="Solana icon" />);
  fireEvent.error(screen.getByRole('img', { name: 'Solana icon' }));
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Solana icon')).toHaveTextContent('SO');
});

test('tries a new image source after a previous source fails', () => {
  const { rerender } = render(
    <AssetIcon src="/broken.png" symbol="SOL" alt="Solana icon" />,
  );
  fireEvent.error(screen.getByRole('img', { name: 'Solana icon' }));

  rerender(<AssetIcon src="/jupiter.png" symbol="JUP" alt="Jupiter icon" />);
  expect(screen.getByRole('img', { name: 'Jupiter icon' })).toHaveAttribute(
    'src',
    '/jupiter.png',
  );
  expect(screen.getByRole('img', { name: 'Jupiter icon' })).toHaveAttribute(
    'loading',
    'lazy',
  );
});
