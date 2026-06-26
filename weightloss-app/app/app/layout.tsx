import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Sidebar } from '@/components/Sidebar';
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
            <div className="min-h-screen flex">
              <Sidebar user={user} />
              <div className="flex-1 flex flex-col md:ml-16 pb-14 md:pb-0">
                <Navbar user={user} />
                <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 sm:py-6">
                  {children}
                </main>
              </div>
            </div>
          ) : (
            <main className="min-h-screen">{children}</main>
          )}
        </Providers>
      </body>
    </html>
  );
}
