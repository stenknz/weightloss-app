import Link from 'next/link';
import { CurrentUser } from '@/lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { LogoutButton } from './LogoutButton';
import {
  LayoutDashboard, Scale, Ruler, Camera, Utensils, Dumbbell,
  Droplet, Footprints, NotebookText, Target, LineChart, User,
  Settings, Download, ShieldCheck
} from 'lucide-react';

export function Navbar({ user }: { user: CurrentUser }) {
  const isAdmin = user.role === 'admin';

  const nav = [
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
    { href: '/progress',   label: 'Progress',    icon: LineChart }
  ];

  const account = [
    { href: '/profile',    label: 'Profile',     icon: User },
    { href: '/settings',   label: 'Settings',    icon: Settings },
    { href: '/export',     label: 'Export',      icon: Download }
  ];

  return (
    <header className="border-b border-border bg-panel sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 flex items-center gap-2 h-12">
        <div className="font-bold text-text flex items-center gap-1.5 mr-2">
          <ShieldCheck size={18} className="text-accent" />
          <span>Weight Loss</span>
        </div>
        <nav className="flex-1 overflow-x-auto -mx-2 px-2">
          <ul className="flex items-center gap-1 min-w-max">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="btn !px-2 !py-1.5">
                  <n.icon size={14} />
                  <span className="hidden md:inline">{n.label}</span>
                </Link>
              </li>
            ))}
            <li className="mx-1 h-5 w-px bg-border" />
            {account.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="btn !px-2 !py-1.5">
                  <n.icon size={14} />
                  <span className="hidden md:inline">{n.label}</span>
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li>
                <Link href="/admin" className="btn !px-2 !py-1.5 border-accent/40 text-accent">
                  <ShieldCheck size={14} />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <div className="flex items-center gap-2 ml-2">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-[10px] text-muted">{user.email}</span>
          </div>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
