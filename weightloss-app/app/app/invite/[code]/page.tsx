import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/RegisterForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Join — Weight Loss',
};

export default async function InvitePage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || '').toUpperCase();
  const r = await query<{
    id: number; uses: number; max_uses: number; expires_at: Date | null;
  }>(
    `SELECT id, uses, max_uses, expires_at FROM invites WHERE code = $1`,
    [code]
  );
  const invite = r.rows[0];
  const valid = !!invite
    && (!invite.expires_at || invite.expires_at > new Date())
    && invite.uses < invite.max_uses;

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card w-full max-w-sm text-center">
          <h1 className="text-xl font-bold mb-2">Invite not valid</h1>
          <p className="text-sm text-muted">
            This invite code is invalid, expired, or has already been used.
            Please ask the admin for a new one.
          </p>
          <a href="/login" className="btn mt-4 inline-block">Back to sign in</a>
        </div>
      </div>
    );
  }
  // Pass the code to the register page
  redirect(`/register?code=${encodeURIComponent(code)}`);
}
