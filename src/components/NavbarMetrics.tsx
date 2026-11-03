/** Compact network and market disclosures shared by every navbar breakpoint.
 * @packageDocumentation
 */

import { useEffect, useId, useRef, useState } from 'react';
import { ValueSkeleton } from '../design-system';

/** Already-formatted values retain the navbar's existing units and rounding. */
interface NavbarMetricsProps {
  marketLoading: boolean;
  networkLoading: boolean;
  price: string;
  marketCap: string;
  volume: string;
  tps: string;
  trueTps: string;
  fee: string;
}

/** Reveal secondary metrics on hover, focus or touch without expanding the bar.
 * @param props - Current display values and initial-loading flags from shared resources.
 * @returns Two single-line triggers with mutually exclusive accessible disclosures.
 */
export default function NavbarMetrics(props: NavbarMetricsProps) {
  const [open, setOpen] = useState<'sol' | 'tps' | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    /** Dismiss details when the user interacts outside the metric group.
     * @param event - Pointer event checked without preventing the target's action.
     */
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(null);
    }
    /** Dismiss without moving focus or reopening a focused trigger.
     * @param event - Keyboard event that may dismiss the current disclosure.
     */
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(null);
    }
    /** Discard stale disclosure geometry when the viewport changes. */
    function resize() {
      setOpen(null);
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', resize);
    };
  }, [open]);

  const groups = [
    {
      key: 'sol' as const,
      label: 'SOL',
      title: 'SOL market details',
      source: 'Jupiter',
      value: props.price,
      loading: props.marketLoading,
      rows: [
        ['Market cap', props.marketCap],
        ['24h volume', props.volume],
      ],
    },
    {
      key: 'tps' as const,
      label: 'TPS',
      title: 'Network performance details',
      source: 'Helius',
      value: props.tps,
      loading: props.networkLoading,
      rows: [
        ['True TPS', props.trueTps],
        ['Average fee', props.fee],
      ],
    },
  ];

  return (
    <div
      className="iris-header-metrics"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null);
      }}
    >
      {groups.map((group) => (
        <div
          key={group.key}
          className={`iris-metric iris-metric-${group.key}`}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setOpen(group.key);
          }}
          onPointerLeave={(event) => {
            if (
              event.pointerType === 'mouse' &&
              !event.currentTarget.contains(document.activeElement)
            )
              setOpen(null);
          }}
        >
          <button
            className="iris-metric-trigger"
            type="button"
            aria-label={`${group.label} ${group.loading ? 'loading' : group.value}, show details`}
            aria-expanded={open === group.key}
            aria-controls={`${id}-${group.key}`}
            onFocus={() => setOpen(group.key)}
            onClick={() => setOpen(group.key)}
          >
            <span>{group.label}</span>{' '}
            {group.loading ? <ValueSkeleton width="45px" /> : group.value}
          </button>
          <section
            id={`${id}-${group.key}`}
            className="iris-metric-popover"
            aria-label={group.title}
            hidden={open !== group.key}
            aria-busy={group.loading || undefined}
          >
            <h2>{group.title}</h2>
            <dl>
              {group.rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {group.loading ? <ValueSkeleton width="64px" /> : value}
                  </dd>
                </div>
              ))}
            </dl>
            <p>via {group.source}</p>
          </section>
        </div>
      ))}
    </div>
  );
}
