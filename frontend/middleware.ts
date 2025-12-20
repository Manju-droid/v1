import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/feed',
  '/debates',
  '/hashtag',
  '/post',
  '/u',
  '/verify',
  '/settings',
  '/notifications',
];

// Routes that should redirect to /feed if already logged in
const authRoutes = ['/login', '/signup'];

// Public routes
const publicRoutes = ['/', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow Next.js internal paths and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('v_auth');
  const isAuthenticated = !!authCookie?.value;

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.includes(pathname);
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If trying to access protected route without auth → redirect to login
  if (isProtectedRoute && !isAuthenticated) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // If already authenticated and trying to access login/signup → redirect to feed
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

