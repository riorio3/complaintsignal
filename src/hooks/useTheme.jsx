import { createContext, useContext } from 'react';

// Context lives here (with the hook) so ThemeProvider.jsx only exports a
// component — keeps React Fast Refresh working for both files.
export const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
