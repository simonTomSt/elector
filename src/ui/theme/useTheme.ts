import { useCallback, useEffect, useState } from 'react';
import { applyTheme, type ThemeName } from './tokens';

const STORAGE_KEY = 'elector.theme';

const readStored = (): ThemeName => {
  if (typeof window === 'undefined') return 'dark';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'light' ? 'light' : 'dark';
};

export const useTheme = (): { theme: ThemeName; toggle: () => void; setTheme: (t: ThemeName) => void } => {
  const [theme, setTheme] = useState<ThemeName>(readStored);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle, setTheme };
};
