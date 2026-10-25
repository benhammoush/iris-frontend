/**
 * React ownership of selected theme mode and shared theme controls.
 * @packageDocumentation
 */

import { createContext, type ReactNode, useContext, useState } from 'react';
import { applyThemeMode, getThemeMode, type UiThemeMode } from './theme';

/** Current UI mode and the theme update operation exposed to descendants. */
interface ThemeContextValue {
  mode: UiThemeMode;
  /** Apply the selected theme mode through the shared theme boundary.
   * @param mode - Supported UI theme mode to select.
   */
  setMode: (mode: UiThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Descendants sharing the selected UI theme. */
interface ProviderProps {
  children: ReactNode;
}

/** Own the selected UI theme and make theme controls available to descendants.
 * @param props - Descendants receiving the selected mode and its update operation.
 * @returns The theme provider around those descendants.
 */
export function ThemeProvider(props: ProviderProps) {
  const { children } = props;
  const [mode, setCurrentMode] = useState<UiThemeMode>(() => getThemeMode());

  /** Apply the selected theme mode through the shared theme boundary.
   * @param nextMode - Supported mode to persist and apply to document tokens.
   */
  function setMode(nextMode: UiThemeMode) {
    localStorage.setItem('color-theme', nextMode);
    applyThemeMode(nextMode);
    setCurrentMode(nextMode);
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Read theme controls and reject use outside the theme provider.
 * @returns Current theme mode and its update operation.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
