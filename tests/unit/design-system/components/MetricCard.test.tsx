/**
 * Shared metric presentation and decorative loading behavior through the public API.
 * @packageDocumentation
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MetricCard, ValueSkeleton } from '../../../../src/design-system';

afterEach(cleanup);

it('renders a metric with its supplied detail and visual tone', () => {
  render(
    <MetricCard label="Volume" value="$42" detail="24 hours" tone="positive" />,
  );
  expect(screen.getByText('Volume')).toHaveClass('iris-metric-label');
  expect(screen.getByText('$42')).toHaveClass('iris-metric-value--positive');
  expect(screen.getByText('24 hours')).toHaveClass('iris-metric-detail');
});

it('supports a decorative loading value without inventing data', () => {
  const { container } = render(
    <MetricCard label="Volume" value={<ValueSkeleton width="8ch" />} />,
  );
  const skeleton = container.querySelector('.iris-value-skeleton');
  expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  expect(skeleton).toHaveStyle({ width: '8ch' });
  expect(container.querySelector('.iris-metric-detail')).toBeNull();
});
