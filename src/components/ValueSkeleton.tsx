type ValueSkeletonProps = {
  className?: string;
  width?: string;
  label?: string;
};

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
