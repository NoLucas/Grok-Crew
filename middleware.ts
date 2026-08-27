import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (process.env.GROK_CREW_PUBLIC_SITE === '1' && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/get', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
