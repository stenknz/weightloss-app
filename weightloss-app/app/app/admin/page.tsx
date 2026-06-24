import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { ShieldCheck, Users, Key, HardDrive, ScrollText, Settings2 } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') return <div className="text-sm text-muted">Admin access required.</div>;

  const links = [
    { href: '/admin/users',   icon: Users,     label: 'Users',       desc: 'Manage accounts, roles, reset passwords' },
    { href: '/admin/invites', icon: Key,       label: 'Invites',     desc: 'Generate invite codes for new users' },
    { href: '/admin/backups', icon: HardDrive, label: 'Backups',     desc: 'View and download backup files' },
    { href: '/admin/audit',   icon: ScrollText, label: 'Audit log',  desc: 'Review admin actions and events' },
    { href: '/admin/settings',icon: Settings2, label: 'Settings',    desc: 'App-wide settings like registration mode' },
  ];

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShieldCheck size={22} className="text-accent" /> Admin
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2 mb-1">
              <l.icon size={16} className="text-accent" />
              <span className="font-semibold">{l.label}</span>
            </div>
            <p className="text-sm text-muted">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
