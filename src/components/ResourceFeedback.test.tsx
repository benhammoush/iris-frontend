import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import ResourceFeedback from './ResourceFeedback';

afterEach(() => vi.useRealTimers());

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

test('keeps routine polls with existing data silent', () => {
  const { rerender } = render(<ResourceFeedback label="Wallet data" hasData />);
  const status = screen.getByRole('status');
  rerender(<ResourceFeedback label="Wallet data" hasData busy />);
  expect(status).toBeEmptyDOMElement();
  rerender(<ResourceFeedback label="Wallet data" hasData />);
  expect(status).toBeEmptyDOMElement();
  expect(status).toHaveClass('iris-sr-only');
});

test.each([false, true])(
  'keeps focus through retry and recovery (hasData: %s), then clears feedback',
  async (hasData) => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(
      <ResourceFeedback
        label="Wallet data"
        error="unavailable"
        hasData={hasData}
        onRetry={retry}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    const status = screen.getByRole('status');
    expect(retry).toHaveBeenCalledTimes(1);
    expect(status).toHaveFocus();

    vi.useFakeTimers();
    rerender(
      <ResourceFeedback
        label="Wallet data"
        busy
        hasData={hasData}
        onRetry={retry}
      />,
    );
    expect(status).toHaveFocus();
    expect(status).toHaveTextContent(
      hasData ? 'Refreshing wallet data...' : 'Loading wallet data...',
    );
    rerender(<ResourceFeedback label="Wallet data" hasData onRetry={retry} />);
    expect(status).toHaveFocus();
    expect(status).toHaveTextContent('Wallet data loaded.');
    act(() => vi.advanceTimersByTime(3000));
    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveClass('iris-sr-only');
    expect(status).toHaveFocus();

    rerender(
      <ResourceFeedback label="Wallet data" busy hasData onRetry={retry} />,
    );
    expect(status).toBeEmptyDOMElement();
    rerender(<ResourceFeedback label="Wallet data" hasData onRetry={retry} />);
    expect(status).toBeEmptyDOMElement();
  },
);

test('does not allow a retry while its resource is busy', async () => {
  const retry = vi.fn();
  render(
    <ResourceFeedback
      label="Wallet data"
      busy
      hasData
      error="unavailable"
      onRetry={retry}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent(
    'Refreshing wallet data...',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).not.toHaveBeenCalled();
});
