import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;
  const isAuthPage = request.nextUrl.pathname === '/auth';
  
  // If not authenticated and not on auth page, redirect to auth
  if (!authToken && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  
  // If authenticated and on auth page, redirect to dashboard
  if (authToken && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|data|.*\\.json$).*)'],
}; 