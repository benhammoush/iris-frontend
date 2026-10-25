/**
 * Shared labeled metric treatment with supporting detail and visual tone.
 * @packageDocumentation
 */

import type { ReactNode } from 'react';

/** Inputs and owner callbacks accepted by MetricCard. */
interface Props {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'positive' | 'negative';
}

/** Render one metric with its label, supporting detail and visual tone.
 * @param props - Metric label, display value, optional detail and visual tone.
 * @returns A labeled metric card without performing data loading or normalization.
 */
export default function MetricCard(props: Props) {
  const { label, value, detail, tone = 'default' } = props;
  return (
    <section className="iris-metric-card">
      <p className="iris-metric-label">{label}</p>
      <p className={`iris-metric-value iris-metric-value--${tone}`}>{value}</p>
      {detail && <p className="iris-metric-detail">{detail}</p>}
    </section>
  );
}
