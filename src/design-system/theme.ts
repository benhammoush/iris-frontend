/**
 * Theme selection and the CSS bridge for the canonical visual tokens.
 * @packageDocumentation
 */

import { themes, type ThemeTokens, type UiThemeMode } from './tokens';

export type { ThemeTokens, UiThemeMode } from './tokens';

export let theme: ThemeTokens = themes.light;
let currentThemeMode: UiThemeMode = 'light';

/** Resolve tokens without changing the active theme.
 * @param mode - Requested mode, defaulting to the current selection.
 * @returns The canonical token set for that mode.
 */
export function getTheme(mode: UiThemeMode = currentThemeMode): ThemeTokens {
  return themes[mode];
}

/** Read the in-memory theme selection without accessing persistence.
 * @returns The active theme mode.
 */
export function getThemeMode(): UiThemeMode {
  return currentThemeMode;
}

/** Apply canonical tokens to the document; persistence belongs to ThemeProvider.
 * @param mode - Supported theme mode to select.
 * @returns The applied token set, also available to TypeScript consumers.
 */
export function applyThemeMode(mode: UiThemeMode): ThemeTokens {
  currentThemeMode = mode;
  theme = themes[mode];

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    const variables = {
      '--app-bg': theme.colors.bg.primary,
      '--app-fg': theme.colors.text.primary,
      '--app-surface': theme.colors.bg.card,
      '--app-border': theme.colors.border.default,
      '--iris-secondary': theme.colors.bg.secondary,
      '--iris-surface': theme.colors.bg.surface,
      '--iris-input': theme.colors.bg.input,
      '--iris-hover': theme.colors.bg.hover,
      '--iris-border': theme.colors.border.default,
      '--iris-border-strong': theme.colors.border.strong,
      '--iris-text': theme.colors.text.primary,
      '--iris-secondary-text': theme.colors.text.secondary,
      '--iris-muted': theme.colors.text.muted,
      '--iris-green': theme.colors.accent.green,
      '--iris-red': theme.colors.accent.red,
      '--iris-dropdown-shadow': theme.shadows.dropdown,
      '--iris-font-sans': theme.fonts.sans,
      '--iris-font-heading': theme.fonts.serif,
      '--iris-font-mono': theme.fonts.uiMono,
      '--iris-font-size-caption': `${theme.fontSizes.caption}px`,
      '--iris-font-size-small': `${theme.fontSizes.small}px`,
      '--iris-font-size-body': `${theme.fontSizes.body}px`,
      '--iris-font-size-metric': `${theme.fontSizes.metric}px`,
      '--iris-surface-shadow': theme.surfaces.shadow,
    };
    for (const [name, value] of Object.entries(variables)) {
      root.style.setProperty(name, value);
    }
    for (const [name, value] of Object.entries(theme.spacing)) {
      root.style.setProperty(`--iris-space-${name}`, `${value}px`);
    }
    for (const [name, value] of Object.entries(theme.radii)) {
      root.style.setProperty(`--iris-radius-${name}`, `${value}px`);
    }
  }

  return theme;
}
