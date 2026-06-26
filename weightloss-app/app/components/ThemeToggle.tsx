'use client';

import { useTheme } from './Providers';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : MonitorSmartphone;
  return (
    <button
      type="button"
      className="btn-ghost"
      title={`Theme: ${theme} (click for ${next})`}
      onClick={() => setTheme(next)}
      aria-label="Toggle theme"
    >
      <Icon size={14} />
    </button>
  );
}
