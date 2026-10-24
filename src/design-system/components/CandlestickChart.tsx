/**
 * OHLC chart lifecycle with user-view preservation and earlier-history loading.
 * @packageDocumentation
 */

import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  type Time,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { useTheme } from '../ThemeProvider';

/** Observed time and OHLC values accepted by the candlestick chart. */
export interface CandleChartPoint {
  timestamp: string;
  openUsd: number;
  highUsd: number;
  lowUsd: number;
  closeUsd: number;
  volumeUsd: number;
}

/** Inputs and owner callbacks accepted by CandlestickChart. */
interface Props {
  candles: CandleChartPoint[];
  height?: number;
  /** Format an available chart value for the visible price axis. */
  valueFormatter?: (value: number) => string;
  canLoadEarlier?: boolean;
  /** Request the preceding historical window from the resource owner. */
  onLoadEarlier?: () => Promise<void>;
}

/** Convert supported candles to the chart OHLC representation. */
function asChartCandles(candles: CandleChartPoint[]) {
  return candles.flatMap((candle) => {
    const timestamp = new Date(candle.timestamp).getTime();
    return Number.isFinite(timestamp) &&
      [
        candle.openUsd,
        candle.highUsd,
        candle.lowUsd,
        candle.closeUsd,
        candle.volumeUsd,
      ].every(Number.isFinite)
      ? [
          {
            time: Math.floor(timestamp / 1000) as Time,
            open: candle.openUsd,
            high: candle.highUsd,
            low: candle.lowUsd,
            close: candle.closeUsd,
            value: candle.volumeUsd,
          },
        ]
      : [];
  });
}

/** Own the candlestick chart and its optional earlier-history loading interaction. */
export default function CandlestickChart({
  candles,
  height = 360,
  valueFormatter,
  canLoadEarlier = false,
  onLoadEarlier,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const hasDataRef = useRef(false);
  const canLoadEarlierRef = useRef(canLoadEarlier);
  const onLoadEarlierRef = useRef(onLoadEarlier);
  const valueFormatterRef = useRef(valueFormatter);
  const { mode } = useTheme();

  useEffect(() => {
    canLoadEarlierRef.current = canLoadEarlier;
  }, [canLoadEarlier]);
  useEffect(() => {
    onLoadEarlierRef.current = onLoadEarlier;
  }, [onLoadEarlier]);
  useEffect(() => {
    valueFormatterRef.current = valueFormatter;
  }, [valueFormatter]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const style = getComputedStyle(document.documentElement);
    /** Read a chart color from the current theme with the supported fallback. */
    const color = (name: string, fallback: string) =>
      style.getPropertyValue(name).trim() || fallback;
    const green = color('--iris-green', '#24d166');
    const red = color('--iris-red', '#f05454');
    const chart = createChart(container, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: color('--iris-muted', '#66788f'),
      },
      grid: {
        vertLines: { color: color('--iris-border', '#ccd7e5') },
        horzLines: { color: color('--iris-border', '#ccd7e5') },
      },
      rightPriceScale: {
        borderColor: color('--iris-border', '#ccd7e5'),
        scaleMargins: { top: 0.08, bottom: 0.26 },
      },
      timeScale: {
        borderColor: color('--iris-border', '#ccd7e5'),
        timeVisible: true,
      },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: { vertTouchDrag: false },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: green,
      downColor: red,
      borderVisible: false,
      wickUpColor: green,
      wickDownColor: red,
      priceFormat: valueFormatterRef.current
        ? {
            type: 'custom',
            /** Use the latest caller formatter without recreating the chart-owned callback. */
            formatter: (value: number) =>
              valueFormatterRef.current
                ? valueFormatterRef.current(value)
                : String(value),
          }
        : undefined,
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
    });
    chart
      .priceScale('volume')
      .applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    chartRef.current = chart;
    candleSeriesRef.current = series;
    volumeSeriesRef.current = volume;
    hasDataRef.current = false;
    let loadingEarlier = false;
    let userNavigated = false;
    /** Record explicit chart navigation so data refresh does not reset the chosen view. */
    const markUserNavigation = () => {
      userNavigated = true;
    };
    /** Request preceding history when the visible range reaches the supported boundary. */
    const loadEarlier = (visibleRange: { from: number } | null) => {
      if (
        !userNavigated ||
        !visibleRange ||
        visibleRange.from > 3 ||
        loadingEarlier ||
        !canLoadEarlierRef.current ||
        !onLoadEarlierRef.current
      )
        return;
      loadingEarlier = true;
      userNavigated = false;
      onLoadEarlierRef.current().finally(() => {
        loadingEarlier = false;
      });
    };
    container.addEventListener('pointerdown', markUserNavigation);
    container.addEventListener('wheel', markUserNavigation, { passive: true });
    chart.timeScale().subscribeVisibleLogicalRangeChange(loadEarlier);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(loadEarlier);
      container.removeEventListener('pointerdown', markUserNavigation);
      container.removeEventListener('wheel', markUserNavigation);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height, mode]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    const style = getComputedStyle(document.documentElement);
    const green = style.getPropertyValue('--iris-green').trim() || '#24d166';
    const red = style.getPropertyValue('--iris-red').trim() || '#f05454';
    const data = asChartCandles(candles);
    candleSeriesRef.current.setData(
      data.map(({ value: _value, ...candle }) => candle),
    );
    volumeSeriesRef.current.setData(
      data.map(({ time, value, open, close }) => ({
        time,
        value,
        color: close >= open ? `${green}88` : `${red}88`,
      })),
    );
    if (!hasDataRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasDataRef.current = true;
    }
  }, [candles, mode]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      aria-label="Historical candlestick chart with USD trading volume"
    />
  );
}
