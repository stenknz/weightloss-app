import { CurrentUser } from '@/lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { LogoutButton } from './LogoutButton';

export function Navbar({ user }: { user: CurrentUser }) {
  return (
    <header className="hidden md:flex sticky top-0 z-30 items-center justify-end gap-3 px-6 py-2"
      style={{
        background: 'rgba(var(--panel-rgb), 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(var(--border), 0.15)'
      }}
    >
      <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--muted))' }}>
        <div className="w-7 h-7 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium" style={{ color: 'rgb(var(--text))' }}>{user.name}</span>
      </div>
      <ThemeToggle />
      <LogoutButton />
    </header>
  );
}
