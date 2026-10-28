# Iris Design System

Iris owns its visual values and reusable UI here. Product pages import from
`design-system`, rather than individual implementation files. This is a local
module, not a published package or a cross-product component library.

## Structure

```text
design-system/
  tokens.ts           # Canonical visual values; no browser side effects
  theme.ts            # Theme selection and CSS custom-property mapping
  ThemeProvider.tsx   # React controls and persisted user selection
  base.css            # Global defaults, not product layouts
  styles.css          # Single CSS entry point
  components/         # Reusable UI and its colocated styles
  index.ts            # Public TypeScript API
```

`src/index.css` imports `styles.css` before app rules. Bootstrap applies the
selected theme before rendering; theme changes update the same CSS variables.
Shared styles therefore do not depend on product styles being loaded. Charts
read CSS variables because their renderer does not inherit CSS colors.

## Tokens

`tokens.ts` is the source of truth for shared colors, fonts, spacing, radii,
type sizes and surface treatment. Do not maintain a second palette in CSS.
`theme.ts` exposes the values needed by CSS, preserving the existing `--app-*`
and `--iris-*` names. Use `getTheme(mode)` for typed values, or variables such as
`--iris-text`, `--iris-space-md` and `--iris-radius-lg` in stylesheets.

Use roles (text, border, input, hover) rather than raw colors for shared UI.
Positive/negative values use the green/red roles. Keep component-specific
geometry local; do not turn every literal dimension into a global token.
Add a shared token when a repeated design decision needs one owner, then update
its consumers together. Existing token values are retained, not a new visual
design or an accessibility certification.

## Exports

- `ThemeProvider`, `useTheme`, and semantic light/dark theme tokens.
- `MetricCard` for compact dashboard metrics.
- `ValueSkeleton` for decorative loading placeholders that reserve value space.
- `VirtualTable` for searchable, sortable virtualized data grids.
- `AreaChart` for responsive time-series charts.
- `CandlestickChart` for OHLC price candles with USD volume.

## Boundary

The design system owns shared tokens, theme behavior and reusable primitives.
Iris pages own Solana data, route behavior, copy, page layouts and provider-branded
art direction. Those rules remain in `src/index.css` or feature stylesheets;
feature-specific overrides follow shared defaults in the cascade. Loading icon
sizes are also feature-owned, while the skeleton's animation is shared.

Keep data clients, domain models and contexts out of this module. Components
receive data and callbacks from their owners. Promote genuinely reused visual
UI here; do not add wrappers or empty categories in anticipation of reuse.

## Changing shared UI

- Keep CSS beside the component, imported through `styles.css`. Keep product
  overrides scoped to the feature, not global redefinitions of shared classes.
- Preserve keyboard interaction, focus indicators, accessible names and loading,
  empty and error states. Skeleton motion respects reduced-motion preferences.
- Cover token application and component behavior with unit tests. Check both
  themes and narrow/wide layouts in the existing browser suite when styles change.
- Run the repository's existing `npm run check` and relevant browser tests.
  Shared styling changes need rendered checks, not just a successful build.
