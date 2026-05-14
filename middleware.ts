import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Decode a JWT payload without verifying the signature.
 * This is safe for route protection because the backend always performs
 * full RS256 / JWKS verification. The middleware only guards the UI.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Use TextDecoder-compatible atob for Edge runtime
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  if (typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now();
}

/**
 * Find the Cognito access token from the request cookies.
 * Amplify (with CookieStorage) sets a cookie whose name matches:
 *   CognitoIdentityServiceProvider.<clientId>.<username>.accessToken
 */
function getCognitoAccessToken(request: NextRequest): string | null {
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.includes('accessToken') &&
      (!clientId || cookie.name.includes(clientId))
    ) {
      return cookie.value;
    }
  }
  return null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login') return NextResponse.next();

  const token = getCognitoAccessToken(request);

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload)) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Verify the token carries at least one relevant Cognito group
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
