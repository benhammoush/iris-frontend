/**
 * Consistent USD unit-price precision without turning nonzero values into zero.
 * @packageDocumentation
 */
import { expect, test } from 'vitest';
import { unitPrice } from '../../../src/data/unitPrice';

test.each([
  [106.264, '$106.26'],
  [83195.7594, '$83,195.76'],
  [1, '$1.00'],
  [2.5, '$2.50'],
  [0.83, '$0.83'],
  [0.1, '$0.1'],
  [0.0000031234567, '$0.0000031235'],
  [0.000000000000000001, '$0.000000000000000001'],
  [0, '$0.00'],
  [-0, '$0.00'],
  [null, '—'],
  [undefined, '—'],
  [NaN, '—'],
  [Infinity, '—'],
  [-Infinity, '—'],
])('formats %s consistently as %s', (value, expected) => {
  expect(unitPrice(value)).toBe(expected);
});

test('does not round even the smallest representable positive price to zero', () => {
  const formatted = unitPrice(Number.MIN_VALUE);
  expect(formatted).not.toBe('$0');
  expect(formatted).not.toBe('$0.00');
  expect(formatted).toMatch(/5$/);
});
