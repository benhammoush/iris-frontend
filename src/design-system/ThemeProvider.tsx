import { createContext, type ReactNode, useContext, useState } from 'react';
import { applyThemeMode, getThemeMode, type UiThemeMode } from './theme';

interface ThemeContextValue {
  mode: UiThemeMode;
  setMode: (mode: UiThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setCurrentMode] = useState<UiThemeMode>(() => getThemeMode());

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

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
