# Iris Design System

This is the local, public API for Iris visual primitives. Product pages import
from `design-system`, rather than individual implementation files.

## Exports

- `ThemeProvider`, `useTheme`, and semantic light/dark theme tokens.
- `MetricCard` for compact dashboard metrics.
- `VirtualTable` for searchable, sortable virtualized data grids.
- `AreaChart` for responsive time-series charts.
- `CandlestickChart` for OHLC price candles with USD volume.

## Boundary

The design system owns visual tokens, theme behavior, and reusable primitives.
Iris pages own Stacks data, route behavior, copy, and page layouts. This keeps
the module ready to move into a shared package without importing Iris domain
models or Worker clients.
