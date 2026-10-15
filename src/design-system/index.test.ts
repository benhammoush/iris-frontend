import { getTheme, type UiThemeMode } from './index';
import { describe, expect, it } from 'vitest';

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
});
