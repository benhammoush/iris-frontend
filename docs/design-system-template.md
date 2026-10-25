# Repository-local design-system template

Use the ownership rules proven in [Iris](../src/design-system/README.md), not
Iris's palette, domain models or component inventory. Each product owns its own
implementation. There is no shared package, branding or synchronization job.

## Start small

```text
src/
  design-system/
    tokens.css          # Canonical visual decisions for this product
    base.css            # Global defaults and accessibility utilities
    styles.css          # One CSS entry point, loaded before product styles
    components/         # Actual reusable UI with colocated CSS
    index.ts            # Public component exports, when there are components
    README.md           # Local ownership and usage decisions
  ...                   # Product screens, data, layouts and bespoke artwork
```

Do not create empty categories. Keep existing app/feature folders unless they
need to change for the work at hand. The folder name is a convention; ownership
and a predictable entry point are the requirements.

## Tokens: one owner

- Use semantic roles for shared colors, fonts, type sizes, spacing, radii,
  borders, shadows and motion decisions that actually recur.
- Preserve visual values during structural migration. A redesign or contrast
  correction is separate work with its own acceptance.
- Small CSS-only products use `tokens.css`. When typed consumers need tokens,
  use a canonical `tokens.ts` and a CSS adapter, as Iris does. Do not maintain
  competing CSS and TypeScript palettes.
- Keep component-specific geometry local. Explicitly scoped design studies,
  illustrations, branded scenes and canvas renderers can own their art values;
  they are not an excuse to duplicate shared control styling.

## Components: real reuse

- Move reusable presentation here; keep API clients, domain decisions, route
  behavior, content and feature layouts outside it.
- Let owners supply children, data and callbacks. Preserve semantic elements,
  native attributes, accessible names, focus and loading/error behavior.
- Colocate component CSS and import it through `styles.css`. Shared components
  must not need app-specific styles to supply their default presentation.
- Consume the public exports. Add wrappers only for a real shared contract,
  not one wrapper per HTML element or future UI-library component.

## Grow only when needed

Split the token file by category when navigation becomes difficult, with one
entry point. Add themes only for an actual theme requirement; add a runtime
provider only for runtime consumers. Add pattern groups when multi-component
interactions genuinely recur. A separate package requires independent consumers
and release needs, not just a larger application.

## Apply and verify

1. Inventory repeated visual values and reusable presentation; record intentional
   feature/artwork exceptions in the local README.
2. Extract tokens and base styles without changing values. Keep shared defaults
   before feature overrides in the CSS cascade.
3. Move existing reusable UI, or extract a repeated presentation contract. Update
   every caller and test; do not manufacture components to complete the tree.
4. Use the repo's existing quality gates. Test component contracts and inspect
   affected rendered flows, keyboard/focus, reduced motion and narrow/wide
   layouts. For multi-theme apps, cover each supported theme. Core browser flows
   cover Chromium, Firefox and WebKit; specialized GPU checks retain their
   existing justified scope. Automation is not real-device certification.

This template defines source organization, not a replacement CI/release policy.
It does not introduce dependencies, a component framework or deployment steps.
