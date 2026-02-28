import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

// Routes that are only for unauthenticated users
const AUTH_ONLY_ROUTES = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We use a __session cookie set by the AuthContext after login.
  // This is a lightweight signal for the edge — actual token verification
  // happens on the backend for every API call.
  const session = request.cookies.get('__session')?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY_ROUTES.some((p) => pathname.startsWith(p));

  // Unauthenticated user trying to reach a protected page → send to login
  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to reach /login → send to dashboard
  if (isAuthOnly && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Admin-only area
  if (pathname.startsWith('/admin')) {
    const role = request.cookies.get('__role')?.value;
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
