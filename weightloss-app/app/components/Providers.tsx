// =============================================================================
// Client-side providers: theme (dark mode) and toaster
// =============================================================================
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark';
}>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'light'
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wla-theme') as Theme | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mq.matches);
      root.classList.toggle('dark', isDark);
      setResolved(isDark ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem('wla-theme', t); } catch { /* ignore */ }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; kind: 'ok' | 'err' | 'info'; msg: string }[]>([]);
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ kind: 'ok' | 'err' | 'info'; msg: string }>;
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, ...ce.detail }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    };
    window.addEventListener('wla:toast', handler as EventListener);
    return () => window.removeEventListener('wla:toast', handler as EventListener);
  }, []);
  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              'card-tight text-sm shadow-lg ' +
              (t.kind === 'ok'   ? 'border-good/40 text-good' :
               t.kind === 'err'  ? 'border-bad/40 text-bad' :
                                   'border-border text-text')
            }
          >
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

export function toast(kind: 'ok' | 'err' | 'info', msg: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('wla:toast', { detail: { kind, msg } }));
}
