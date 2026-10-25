/**
 * Canonical visual values for shared Iris UI; no DOM or persistence side effects.
 * @packageDocumentation
 */

/** Supported light and dark interface modes. */
export type UiThemeMode = 'dark' | 'light';

export const baseTokens = {
  fonts: {
    serif: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
    sans: 'system-ui, sans-serif',
    mono: "ui-monospace, 'Cascadia Code', 'SFMono-Regular', Consolas, monospace",
    uiMono: "ui-monospace, 'Cascadia Code', Consolas, monospace",
  },
  radii: { sm: 3, control: 4, md: 5, lg: 7, xl: 11, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
  fontSizes: { caption: 10, small: 11, body: 12, metric: 21 },
  surfaces: { shadow: '0 2px 12px rgba(15, 23, 42, 0.06)' },
} as const;

const darkTheme = {
  ...baseTokens,
  colors: {
    bg: {
      primary: '#050607',
      secondary: '#090b0e',
      card: '#0d1016',
      input: '#050607',
      hover: '#13161c',
      deep: '#0b0e14',
      surface: '#141920',
    },
    border: {
      default: '#1a2030',
      strong: '#252d3d',
      subtle: '#0d1016',
      muted: '#2c3548',
      grid: '#1e2535',
    },
    text: {
      primary: '#dde4ee',
      secondary: '#8e9eb5',
      muted: '#5c6a7e',
      dimmer: '#424e60',
      link: '#4d9fff',
      bright: '#edf2f8',
    },
    accent: {
      primary: '#ffffff',
      blue: '#22d3ee',
      green: '#24d166',
      red: '#f05454',
      yellow: '#f0b429',
      purple: '#a78bfa',
      orange: '#f97316',
    },
  },
  shadows: {
    card: '0 2px 12px rgba(0,0,0,0.5)',
    dropdown: '0 8px 28px rgba(0,0,0,0.7)',
  },
} as const;

const lightTheme = {
  ...baseTokens,
  colors: {
    bg: {
      primary: '#f5f7fb',
      secondary: '#eef3f8',
      card: '#ffffff',
      input: '#ffffff',
      hover: '#e7eef7',
      deep: '#edf2f7',
      surface: '#e3ebf5',
    },
    border: {
      default: '#ccd7e5',
      strong: '#aebdd1',
      subtle: '#dfe7f1',
      muted: '#96a8c0',
      grid: '#d7e0eb',
    },
    text: {
      primary: '#17212f',
      secondary: '#405269',
      muted: '#66788f',
      dimmer: '#7d8ea3',
      link: '#2563eb',
      bright: '#0b1220',
    },
    accent: {
      primary: '#0b1220',
      blue: '#0891b2',
      green: '#16934a',
      red: '#dc2626',
      yellow: '#c68a00',
      purple: '#7c3aed',
      orange: '#ea580c',
    },
  },
  shadows: {
    card: '0 8px 24px rgba(15,23,42,0.08)',
    dropdown: '0 14px 36px rgba(15,23,42,0.16)',
  },
} as const;

export const themes = { dark: darkTheme, light: lightTheme } as const;

/** Shared interface colors, dimensions and typography used by the theme boundary. */
export type ThemeTokens = typeof darkTheme | typeof lightTheme;
