/**
 * Regression coverage and controlled fixtures for index.
 * @packageDocumentation
 */

import {
  applyThemeMode,
  getTheme,
  getThemeMode,
  type UiThemeMode,
} from '../../../src/design-system/index';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(() => applyThemeMode('light'));

describe('Iris design system', () => {
  it.each<UiThemeMode>(['light', 'dark'])(
    'exposes semantic %s theme tokens',
    (mode) => {
      const theme = getTheme(mode);

      expect(theme.colors.bg.primary).toMatch(/^#/);
      expect(theme.colors.text.primary).toMatch(/^#/);
      expect(theme.colors.accent.green).toMatch(/^#/);
      expect(theme.spacing.lg).toBeGreaterThan(0);
    },
  );

  it.each<UiThemeMode>(['dark', 'light'])(
    'applies canonical %s values to CSS and keeps selection in sync',
    (mode) => {
      const tokens = getTheme(mode);
      expect(applyThemeMode(mode)).toBe(tokens);
      expect(getThemeMode()).toBe(mode);
      expect(getTheme()).toBe(tokens);
      expect(document.documentElement.dataset.theme).toBe(mode);
      expect(document.documentElement.style.colorScheme).toBe(mode);

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--app-bg')).toBe(tokens.colors.bg.primary);
      expect(style.getPropertyValue('--app-surface')).toBe(
        tokens.colors.bg.card,
      );
      expect(style.getPropertyValue('--iris-text')).toBe(
        tokens.colors.text.primary,
      );
      expect(style.getPropertyValue('--iris-muted')).toBe(
        tokens.colors.text.muted,
      );
      expect(style.getPropertyValue('--iris-border')).toBe(
        tokens.colors.border.default,
      );
      expect(style.getPropertyValue('--iris-green')).toBe(
        tokens.colors.accent.green,
      );
      expect(style.getPropertyValue('--iris-red')).toBe(
        tokens.colors.accent.red,
      );
      expect(style.getPropertyValue('--iris-font-mono')).toBe(
        tokens.fonts.uiMono,
      );
      expect(style.getPropertyValue('--iris-font-size-body')).toBe(
        `${tokens.fontSizes.body}px`,
      );
      expect(style.getPropertyValue('--iris-surface-shadow')).toBe(
        tokens.surfaces.shadow,
      );
      for (const [name, value] of Object.entries(tokens.spacing)) {
        expect(style.getPropertyValue(`--iris-space-${name}`)).toBe(
          `${value}px`,
        );
      }
      for (const [name, value] of Object.entries(tokens.radii)) {
        expect(style.getPropertyValue(`--iris-radius-${name}`)).toBe(
          `${value}px`,
        );
      }
    },
  );

  it('resolves another mode without mutating the active theme', () => {
    applyThemeMode('dark');
    getTheme('light');
    expect(getThemeMode()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
