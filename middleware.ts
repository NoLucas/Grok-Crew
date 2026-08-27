import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === '/get') {
    return NextResponse.rewrite(new URL('/existing-home.html', request.url));
  }
  if (process.env.GROK_CREW_PUBLIC_SITE === '1' && path === '/') {
    return NextResponse.rewrite(new URL('/existing-home.html', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/get'],
};
