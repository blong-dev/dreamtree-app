/**
 * DreamTree Middleware
 *
 * Handles session validation and route protection.
 * BUG-025: Validates sessions before redirecting to prevent stale cookie loops.
 */

import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for middleware (required for local dev with better-sqlite3)
export const runtime = 'nodejs';
import { getDB } from '@/lib/db/connection';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/api/auth/login', '/api/auth/signup', '/about', '/coming-soon'];

// Routes that require authentication
const PROTECTED_ROUTES = ['/workbook', '/profile', '/tools', '/onboarding'];

// Routes that require admin role (BUG-206)
// Returns 404 for non-admins to hide existence of these pages
// Both /admin (current) and /ops (future) are protected
const ADMIN_ROUTES = ['/ops', '/admin'];

// Routes gated behind "coming soon" on production
// These are available on staging but not yet on dreamtree.org
const COMING_SOON_ROUTES = ['/workbook', '/tools'];

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export async function middleware(request: NextRequest) { // code_id:488
  const { pathname, hostname } = request.nextUrl;

  // Production gate: redirect coming-soon routes on dreamtree.org
  // Staging (dreamtree-staging.braedon.workers.dev) has full access
  const isProduction = hostname === 'dreamtree.org' || hostname === 'www.dreamtree.org';
  const isComingSoonRoute = COMING_SOON_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProduction && isComingSoonRoute) {
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }

  // Get session cookie
  const sessionId = request.cookies.get('dt_session')?.value;
  const hasSessionCookie = !!sessionId;

  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Check if this is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // API routes other than auth should check session in their handlers
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    // Let API routes handle their own auth
    return NextResponse.next();
  }

  // Admin routes require admin role (BUG-206)
  // Returns 404 to hide existence of these pages from non-admins
  const isAdminRoute = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isAdminRoute) {
    if (!hasSessionCookie) {
      // No session - return 404 (not login redirect)
      return new NextResponse(null, { status: 404 });
    }

    try {
      const db = getDB();

      // Get session and check user role
      const result = await db
        .prepare(`
          SELECT u.user_role
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ?
        `)
        .bind(sessionId)
        .first<{ user_role: string }>();

      if (!result || result.user_role !== 'admin') {
        // Not admin - return 404 (not 403)
        return new NextResponse(null, { status: 404 });
      }

      // Admin - allow through
      return NextResponse.next();
    } catch {
      // DB error - return 404 to be safe
      return new NextResponse(null, { status: 404 });
    }
  }

  // Users with session cookie accessing login/signup - validate session first (BUG-025)
  if (hasSessionCookie && (pathname === '/login' || pathname === '/signup')) {
    try {
      const db = getDB();

      // Validate session exists in database
      // Note: sessions table doesn't have expires_at column, so just check existence
      const session = await db
        .prepare('SELECT id, user_id FROM sessions WHERE id = ?')
        .bind(sessionId)
        .first<{ id: string; user_id: string }>();

      if (!session) {
        // Session doesn't exist - clear the stale cookie and let them through
        const response = NextResponse.next();
        response.cookies.delete('dt_session');
        return response;
      }

      // Valid session - redirect to workbook (staging) or home (production)
      const redirectTo = isProduction ? '/' : '/workbook';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    } catch {
      // If DB query fails, clear cookie to be safe and let them through
      const response = NextResponse.next();
      response.cookies.delete('dt_session');
      return response;
    }
  }

  // Unauthenticated users accessing protected routes should redirect to login
  if (!hasSessionCookie && isProtectedRoute && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original URL to redirect back after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
