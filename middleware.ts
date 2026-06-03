import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  if (typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now();
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login') return NextResponse.next();

  const token = request.cookies.get('store_token')?.value ?? null;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload)) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const groups: string[] = Array.isArray(payload['cognito:groups'])
    ? (payload['cognito:groups'] as string[])
    : [];

  const storeId = process.env.NEXT_PUBLIC_STORE_ID ?? '';
  const isAuthorized =
    groups.includes('platform_admins') ||
    groups.some(g => storeId ? g.startsWith(`store-${storeId}-`) : g.startsWith('store-'));

  if (!isAuthorized) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
