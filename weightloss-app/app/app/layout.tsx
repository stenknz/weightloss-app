import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Weight Loss',
  description: 'Self-hosted weight loss tracker for the household',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.ico' }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {user ? (
            <div className="min-h-screen flex flex-col">
              <Navbar user={user} />
              <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-4">
                {children}
              </main>
              <footer className="text-center text-xs text-muted py-4">
                Local-first weight loss tracker
              </footer>
            </div>
          ) : (
            <main className="min-h-screen">{children}</main>
          )}
        </Providers>
      </body>
    </html>
  );
}
