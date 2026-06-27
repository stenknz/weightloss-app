import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProfileClient } from '@/components/ProfileClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Profile — Weight Loss',
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Profile</h1>
      <ProfileClient user={user} />
    </div>
  );
}
