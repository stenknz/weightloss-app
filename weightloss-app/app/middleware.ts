// =============================================================================
// Middleware: lightweight session presence check used for redirects only.
// Full session validation happens inside server components / API routes via
// lib/auth.ts so this stays fast.
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'weightloss_session';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/invite',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/health'
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  if (pathname.startsWith('/static')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
