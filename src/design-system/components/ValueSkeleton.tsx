/**
 * Decorative loading placeholders that preserve value layout.
 * @packageDocumentation
 */

/** Loading placeholder dimensions, styling and accessible label. */
type ValueSkeletonProps = {
  className?: string;
  width?: string;
  label?: string;
};

/** Reserve accessible metric layout while a value is loading.
 * @param props - Placeholder dimensions, styling and descriptive label.
 * @returns A decorative placeholder preserving the metric's layout.
 */
export default function ValueSkeleton(props: ValueSkeletonProps) {
  const { className = '', width, label = 'Loading value' } = props;
  return (
    <span
      className={`iris-value-skeleton ${className}`.trim()}
      style={width ? { width } : undefined}
      aria-label={label}
      aria-hidden="true"
    />
  );
}
