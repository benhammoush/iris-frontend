/**
 * Accessible loading placeholders that preserve metric layout.
 * @packageDocumentation
 */

/** Loading placeholder dimensions, styling and accessible label. */
type ValueSkeletonProps = {
  className?: string;
  width?: string;
  label?: string;
};

/** Reserve accessible metric layout while a value is loading. */
export default function ValueSkeleton({
  className = '',
  width,
  label = 'Loading value',
}: ValueSkeletonProps) {
  return (
    <span
      className={`iris-value-skeleton ${className}`.trim()}
      style={width ? { width } : undefined}
      aria-label={label}
      aria-hidden="true"
    />
  );
}
