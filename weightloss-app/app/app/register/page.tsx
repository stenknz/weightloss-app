import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getBoolSetting } from '@/lib/settings';
import { RegisterForm } from '@/components/RegisterForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Register — Weight Loss',
};

export default async function RegisterPage({ searchParams }: { searchParams: { code?: string } }) {
  const user = await getCurrentUser();
  if (user) redirect('/');
  const inviteOnly = await getBoolSetting('invite_only', true);

  if (inviteOnly && !searchParams.code) {
    // Tell user they need an invite
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card w-full max-w-sm text-center">
          <h1 className="text-xl font-bold mb-2">Invite required</h1>
          <p className="text-sm text-muted">
            This household runs on invite-only sign-up. Please ask the admin to
            generate an invite link for you, then open it to register.
          </p>
          <a href="/login" className="btn mt-4 inline-block">Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">Create account</h1>
        <p className="text-sm text-muted mb-4">
          {inviteOnly ? 'Use the invite code you were given.' : 'Set up your tracker account.'}
        </p>
        <RegisterForm inviteCode={searchParams.code} />
        <p className="text-xs text-muted mt-4 text-center">
          Already have an account? <a href="/login" className="text-accent hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
