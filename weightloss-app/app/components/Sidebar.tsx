'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Scale, Ruler, Camera, Utensils, Dumbbell,
  Droplet, Footprints, NotebookText, Target, LineChart, User,
  Settings, Download, ShieldCheck, LogOut, Sun, Moon,
  MonitorSmartphone, Menu
} from 'lucide-react';
import { useTheme } from './Providers';
import { useState } from 'react';
import type { CurrentUser } from '@/lib/auth';
import { logout } from '@/lib/actions/auth';

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user.role === 'admin';

  const mainNav = [
    { href: '/',           label: 'Dashboard',   icon: LayoutDashboard },
    { href: '/weigh-in',   label: 'Weigh-in',    icon: Scale },
    { href: '/measurements', label: 'Measurements', icon: Ruler },
    { href: '/photos',     label: 'Photos',      icon: Camera },
    { href: '/food',       label: 'Food',        icon: Utensils },
    { href: '/exercise',   label: 'Exercise',    icon: Dumbbell },
    { href: '/water',      label: 'Water',       icon: Droplet },
    { href: '/steps',      label: 'Steps',       icon: Footprints },
    { href: '/notes',      label: 'Notes',       icon: NotebookText },
    { href: '/goals',      label: 'Goals',       icon: Target },
    { href: '/progress',   label: 'Progress',    icon: LineChart },
  ];

  const bottomNav = [
    { href: '/profile',    label: 'Profile',     icon: User },
    { href: '/settings',   label: 'Settings',    icon: Settings },
    { href: '/export',     label: 'Export',      icon: Download },
  ];

  if (isAdmin) {
    bottomNav.push({ href: '/admin', label: 'Admin', icon: ShieldCheck });
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : MonitorSmartphone;
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full z-40 flex-col w-16"
        style={{
          background: 'rgba(var(--panel-rgb), 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(var(--border), 0.2)'
        }}
      >
        {/* Scrollable top section: logo + nav */}
        <div className="flex-1 flex flex-col items-center gap-0.5 py-3 overflow-y-auto scrollbar-none min-h-0">
          <Link href="/" className="mb-3 flex items-center justify-center w-10 h-10 rounded-xl gradient-accent flex-shrink-0">
            <span className="text-white font-bold text-sm">WL</span>
          </Link>

          <nav className="flex flex-col items-center gap-0.5">
            {mainNav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 flex-shrink-0"
                style={{
                  background: isActive(n.href) ? 'linear-gradient(135deg, rgb(var(--teal) / 0.15), rgb(var(--blue) / 0.15))' : 'transparent',
                  color: isActive(n.href) ? 'rgb(var(--accent))' : 'rgb(var(--muted))'
                }}
              >
                <n.icon size={18} />
                <span className="absolute left-14 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: 'rgb(var(--panel))',
                    border: '1px solid rgba(var(--border), 0.3)',
                    color: 'rgb(var(--text))'
                  }}
                >
                  {n.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom section - always visible */}
        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 py-3"
          style={{
            background: 'rgba(var(--panel-rgb), 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {bottomNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 flex-shrink-0"
              style={{
                background: isActive(n.href) ? 'linear-gradient(135deg, rgb(var(--teal) / 0.15), rgb(var(--blue) / 0.15))' : 'transparent',
                color: isActive(n.href) ? 'rgb(var(--accent))' : 'rgb(var(--muted))'
              }}
            >
              <n.icon size={18} />
              <span className="absolute left-14 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: 'rgb(var(--panel))',
                  border: '1px solid rgba(var(--border), 0.3)',
                  color: 'rgb(var(--text))'
                }}
              >
                {n.label}
              </span>
            </Link>
          ))}

          {/* Divider */}
          <div className="w-6 h-px my-2 flex-shrink-0" style={{ background: 'rgba(var(--border), 0.3)' }} />

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(nextTheme)}
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 flex-shrink-0"
            style={{ color: 'rgb(var(--muted))' }}
            aria-label="Toggle theme"
          >
            <ThemeIcon size={16} />
            <span className="absolute left-14 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'rgb(var(--panel))',
                border: '1px solid rgba(var(--border), 0.3)',
                color: 'rgb(var(--text))'
              }}
            >
              Theme: {theme}
            </span>
          </button>

          {/* Logout */}
          <LogoutButtonSidebar />
        </div>
      </aside>

      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{
          background: 'rgba(var(--panel-rgb), 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(var(--border), 0.2)'
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
            <span className="text-white font-bold text-xs">WL</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'rgb(var(--text))' }}>WeightLoss</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(nextTheme)}
            className="btn-ghost"
            aria-label="Toggle theme"
          >
            <ThemeIcon size={16} />
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = '/login';
            }}
            className="btn-ghost"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="btn-ghost"
            aria-label="Menu"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div
            className="fixed right-0 top-0 h-full w-64 p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgb(var(--panel))',
              borderLeft: '1px solid rgba(var(--border), 0.2)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
                  <span className="text-white font-bold text-xs">WL</span>
                </div>
                <span className="font-semibold" style={{ color: 'rgb(var(--text))' }}>WeightLoss</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn-ghost"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6 p-3 rounded-xl" style={{ background: 'rgba(var(--bg), 0.5)' }}>
              <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-white font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text))' }}>{user.name}</div>
                <div className="text-xs truncate" style={{ color: 'rgb(var(--muted))' }}>{user.email}</div>
              </div>
            </div>

            <nav className="flex flex-col gap-0.5">
              {mainNav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
                  style={{
                    background: isActive(n.href) ? 'linear-gradient(135deg, rgb(var(--teal) / 0.12), rgb(var(--blue) / 0.12))' : 'transparent',
                    color: isActive(n.href) ? 'rgb(var(--accent))' : 'rgb(var(--text))'
                  }}
                >
                  <n.icon size={18} />
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 mb-2 h-px" style={{ background: 'rgba(var(--border), 0.2)' }} />

            <nav className="flex flex-col gap-0.5">
              {bottomNav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
                  style={{
                    background: isActive(n.href) ? 'linear-gradient(135deg, rgb(var(--teal) / 0.12), rgb(var(--blue) / 0.12))' : 'transparent',
                    color: isActive(n.href) ? 'rgb(var(--accent))' : 'rgb(var(--text))'
                  }}
                >
                  <n.icon size={18} />
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-1 h-14 safe-area-bottom"
        style={{
          background: 'rgba(var(--panel-rgb), 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(var(--border), 0.2)'
        }}
      >
        {mainNav.slice(0, 5).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-150"
            style={{
              color: isActive(n.href) ? 'rgb(var(--accent))' : 'rgb(var(--muted))'
            }}
          >
            <n.icon size={18} />
            <span className="text-[9px] font-medium">{n.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

function LogoutButtonSidebar() {
  return (
    <button
      type="button"
      onClick={async () => {
        await logout();
        window.location.href = '/login';
      }}
      className="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150"
      style={{ color: 'rgb(var(--muted))' }}
      aria-label="Sign out"
    >
      <LogOut size={16} />
      <span className="absolute left-14 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: 'rgb(var(--panel))',
          border: '1px solid rgba(var(--border), 0.3)',
          color: 'rgb(var(--text))'
        }}
      >
        Sign out
      </span>
    </button>
  );
}
