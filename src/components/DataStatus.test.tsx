import { render, screen } from '@testing-library/react';
import DataStatus from './DataStatus';

test('renders a discreet source watermark without freshness metadata', () => {
  render(
    <DataStatus
      meta={{
        source: 'worker',
        freshness: 'fresh',
        asOf: '2026-10-03T12:00:00Z',
      }}
    />,
  );
  expect(
    screen.getByText('Data from Jupiter, Birdeye, and DefiLlama'),
  ).toBeInTheDocument();
  expect(screen.queryByText(/as of/i)).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /retry/i }),
  ).not.toBeInTheDocument();
});

test('shows a concise unavailable message for Worker errors', () => {
  const { rerender } = render(<DataStatus meta={{}} />);
  expect(
    screen.getByText('Data from Jupiter, Birdeye, and DefiLlama'),
  ).toBeInTheDocument();
  rerender(
    <DataStatus error={{ message: 'Unavailable', requestId: 'req-1' }} />,
  );
  expect(screen.getByText('Data unavailable: Unavailable')).toBeInTheDocument();
});
