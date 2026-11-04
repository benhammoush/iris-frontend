/**
 * Shared USD unit-price display, distinct from totals and exact transfer amounts.
 * @packageDocumentation
 */

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fractionalDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 5,
});

/** Keep tiny prices nonzero while using familiar cents for prices of at least $1.
 * @param value - Normalized USD unit price, or an unavailable value.
 * @returns Consistent display text without altering the source price.
 */
export function unitPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return (
    value !== 0 && Math.abs(value) < 1 ? fractionalDollars : dollars
  ).format(value === 0 ? 0 : value);
}
