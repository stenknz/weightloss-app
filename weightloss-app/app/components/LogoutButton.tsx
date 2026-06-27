'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';

export function LogoutButton() {
  const router = useRouter();
  async function onClick() {
    await logout();
    router.push('/login');
    router.refresh();
  }
  return (
    <button type="button" className="btn-ghost" onClick={onClick} title="Sign out">
      <LogOut size={14} />
    </button>
  );
}
