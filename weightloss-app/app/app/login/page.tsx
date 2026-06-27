import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getBoolSetting } from '@/lib/settings';
import { LoginForm } from '@/components/LoginForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Login — Weight Loss',
};

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; invite?: string } }) {
  const user = await getCurrentUser();
  if (user) redirect('/');
  const inviteOnly = await getBoolSetting('invite_only', true);
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">Sign in</h1>
        <p className="text-sm text-muted mb-4">Welcome back to your tracker.</p>
        <LoginForm next={searchParams.next} invite={searchParams.invite} />
        {inviteOnly ? (
          <p className="text-xs text-muted mt-4 text-center">
            Don't have an account? Ask the admin for an invite link.
          </p>
        ) : (
          <p className="text-xs text-muted mt-4 text-center">
            No account? <a href="/register" className="text-accent hover:underline">Register</a>
          </p>
        )}
      </div>
    </div>
  );
}
