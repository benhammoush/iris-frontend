import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'positive' | 'negative';
}

export default function MetricCard({
  label,
  value,
  detail,
  tone = 'default',
}: Props) {
  return (
    <section className="iris-metric-card">
      <p className="iris-eyebrow">{label}</p>
      <p className={`iris-metric-value iris-metric-value--${tone}`}>{value}</p>
      {detail && <p className="iris-metric-detail">{detail}</p>}
    </section>
  );
}
