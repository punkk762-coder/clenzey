import React, { createContext, useContext } from 'react';
import { theme, Theme } from './index';

const ThemeContext = createContext<Theme>(theme);

export interface ThemeProviderProps {
  children: React.ReactNode;
  value?: Theme;
}

export function ThemeProvider({ children, value = theme }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
