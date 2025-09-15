import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;
  const isAuthPage = request.nextUrl.pathname === '/auth';
  
  console.log(`[middleware] Processing request for: ${request.nextUrl.pathname}`);
  
  // Basic auth check only - no Firebase calls in Edge Runtime
  // If not authenticated and not on auth page, redirect to auth
  if (!authToken && !isAuthPage) {
    console.log('[middleware] No auth token, redirecting to /auth');
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  
  // If authenticated and on auth page, redirect to home for client-side role routing
  if (authToken && isAuthPage) {
    console.log('[middleware] Authenticated user on auth page, redirecting to /home');
    return NextResponse.redirect(new URL('/home', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|data|.*\\.json$).*)'],
}; 