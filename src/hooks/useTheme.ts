import { useState, useLayoutEffect, useCallback, useSyncExternalStore } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-mode';

const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

function subscribeSystemTheme(callback: () => void) {
  darkMQ.addEventListener('change', callback);
  return () => darkMQ.removeEventListener('change', callback);
}

function getSystemDark() {
  return darkMQ.matches;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#1e40af');
  }
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
  });

  const systemDark = useSyncExternalStore(subscribeSystemTheme, getSystemDark);

  const resolvedTheme: ResolvedTheme =
    mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useLayoutEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setMode = useCallback((newMode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, newMode);
    setModeState(newMode);
  }, []);

  return { mode, resolvedTheme, setMode } as const;
}
