import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ResourceFeedback from './ResourceFeedback';

test('announces initial loading without offering a retry', () => {
  render(<ResourceFeedback label="Wallet data" busy />);
  expect(screen.getByRole('status')).toHaveTextContent(
    'Loading wallet data...',
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('explains retained data after a failed refresh', () => {
  render(<ResourceFeedback label="Wallet data" error="unavailable" hasData />);
  expect(screen.getByRole('status')).toHaveTextContent(
    'Wallet data is currently unavailable. Previously loaded data is still shown.',
  );
});

test('keeps focus on a persistent live region through retry and recovery', async () => {
  const user = userEvent.setup();
  const retry = vi.fn();
  const { rerender } = render(
    <ResourceFeedback
      label="Wallet data"
      error="unavailable"
      onRetry={retry}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  const status = screen.getByRole('status');
  expect(retry).toHaveBeenCalledTimes(1);
  expect(status).toHaveFocus();

  rerender(<ResourceFeedback label="Wallet data" busy onRetry={retry} />);
  expect(status).toHaveFocus();
  expect(status).toHaveTextContent('Loading wallet data...');
  rerender(<ResourceFeedback label="Wallet data" onRetry={retry} />);
  expect(status).toHaveFocus();
  expect(status).toHaveTextContent('Wallet data loaded.');
});

test('does not allow a retry while its resource is busy', async () => {
  const retry = vi.fn();
  render(
    <ResourceFeedback
      label="Wallet data"
      busy
      error="unavailable"
      onRetry={retry}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).not.toHaveBeenCalled();
});
