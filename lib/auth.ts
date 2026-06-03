const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID ?? '';

function getStoreHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (STORE_ID) headers['X-Store-ID'] = STORE_ID;
  return headers;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/${secure}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function configureAmplify() {}

export function getAdminAccessToken(): string | null {
  return getCookie('store_token');
}

export type AdminSignInResult =
  | { type: 'success' }
  | { type: 'new_password_required'; session: string; username: string }
  | { type: 'error'; message: string };

export async function adminSignIn(email: string, password: string): Promise<AdminSignInResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: getStoreHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { type: 'error', message: data.detail ?? 'Login failed' };

    if (data.challenge === 'new_password_required') {
      return { type: 'new_password_required', session: data.session, username: data.username };
    }

    setCookie('store_token', data.access_token, 1);
    setCookie('store_refresh_token', data.refresh_token, 30);
    return { type: 'success' };
  } catch (err) {
    return { type: 'error', message: err instanceof Error ? err.message : 'Login failed' };
  }
}

export async function completeNewPassword(
  username: string,
  session: string,
  newPassword: string,
): Promise<AdminSignInResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/admin-complete-new-password`, {
      method: 'POST',
      headers: getStoreHeaders(),
      body: JSON.stringify({ username, session, new_password: newPassword }),
    });
    const data = await res.json();
    if (!res.ok) return { type: 'error', message: data.detail ?? 'Failed to set password' };

    setCookie('store_token', data.access_token, 1);
    setCookie('store_refresh_token', data.refresh_token, 30);
    return { type: 'success' };
  } catch (err) {
    return { type: 'error', message: err instanceof Error ? err.message : 'Failed to set password' };
  }
}

export async function adminSignOut(): Promise<void> {
  const token = getAdminAccessToken();
  try {
    const headers: Record<string, string> = { ...getStoreHeaders() };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${API_BASE}/auth/admin-logout`, { method: 'POST', headers });
  } catch {}
  deleteCookie('store_token');
  deleteCookie('store_refresh_token');
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getCookie('store_refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/admin-refresh`, {
      method: 'POST',
      headers: getStoreHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setCookie('store_token', data.access_token, 1);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function forgotPasswordRequest(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: getStoreHeaders(),
      body: JSON.stringify({ email }),
    });
    if (res.ok || res.status === 204) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, message: data.detail ?? 'Could not send reset code' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not send reset code' };
  }
}

export async function forgotPasswordConfirm(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/confirm-forgot-password`, {
      method: 'POST',
      headers: getStoreHeaders(),
      body: JSON.stringify({ email, code, new_password: newPassword }),
    });
    if (res.ok || res.status === 204) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, message: data.detail ?? 'Could not reset password' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not reset password' };
  }
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const token = getAdminAccessToken();
  try {
    const headers: Record<string, string> = { ...getStoreHeaders() };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/auth/admin-change-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    if (res.ok || res.status === 204) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, message: data.detail ?? 'Failed to change password' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Failed to change password' };
  }
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 > Date.now();
}

export const COGNITO_ACCESS_TOKEN_COOKIE = 'store_token';
