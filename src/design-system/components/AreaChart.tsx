/**
 * Area-series chart creation, theme updates and owned resource cleanup.
 * @packageDocumentation
 */

import {
  AreaSeries,
  ColorType,
  createChart,
  type Time,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { useTheme } from '../ThemeProvider';

/** Observed time/value pair accepted by the area-series chart. */
export interface AreaChartPoint {
  date: string;
  value: number;
}

/** Inputs and owner callbacks accepted by AreaChart. */
interface Props {
  points: AreaChartPoint[];
  height?: number;
  /** Format an available chart value for the visible price axis. */
  valueFormatter?: (value: number) => string;
}

/** Convert supported history points to the chart time and value representation. */
function asChartPoints(points: AreaChartPoint[]) {
  return points.flatMap(({ date, value }) => {
    const timestamp = new Date(date).getTime();
    return Number.isFinite(timestamp) && Number.isFinite(value)
      ? [{ time: Math.floor(timestamp / 1000) as Time, value }]
      : [];
  });
}

/** Own the chart instance, data updates and cleanup for an area-series view. */
export default function AreaChart({
  points,
  height = 360,
  valueFormatter,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mode } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const style = getComputedStyle(document.documentElement);
    /** Read a chart color from the current theme with the supported fallback. */
    const color = (name: string) => style.getPropertyValue(name).trim();
    const chart = createChart(container, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: color('--iris-muted'),
      },
      grid: {
        vertLines: { color: color('--iris-border') },
        horzLines: { color: color('--iris-border') },
      },
      rightPriceScale: { borderColor: color('--iris-border') },
      timeScale: { borderColor: color('--iris-border'), timeVisible: false },
      handleScroll: { vertTouchDrag: false },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: color('--iris-green'),
      topColor: `${color('--iris-green')}55`,
      bottomColor: `${color('--iris-green')}05`,
      lineWidth: 2,
      priceFormat: valueFormatter
        ? { type: 'custom', formatter: valueFormatter }
        : undefined,
    });
    series.setData(asChartPoints(points));
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [height, mode, points, valueFormatter]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      aria-label="Historical market chart"
    />
  );
}
