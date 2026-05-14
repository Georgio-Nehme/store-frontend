/**
 * Cognito / Amplify auth helpers for admin users (platform admins + store admins/staff).
 *
 * Amplify is configured to store tokens in cookies so the Next.js middleware
 * can read them server-side for route protection.
 *
 * Customer auth is self-managed (JWT in localStorage) and is unchanged.
 */

import { Amplify } from 'aws-amplify';
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  fetchAuthSession,
  confirmSignIn,
  updatePassword,
  resetPassword,
  confirmResetPassword,
  type SignInOutput,
} from 'aws-amplify/auth';
import { CookieStorage } from 'aws-amplify/utils';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';

// ── Configure Amplify (called once, idempotent) ────────────────────────────────

let configured = false;

export function configureAmplify() {
  if (configured) return;
  configured = true;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        loginWith: { email: true },
      },
    },
  });

  // Store tokens in cookies so Next.js middleware can read them
  cognitoUserPoolsTokenProvider.setKeyValueStorage(new CookieStorage({
    domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    path: '/',
    expires: 365,
    secure: false,
    sameSite: 'lax',
  }));
}

// ── Auth actions ───────────────────────────────────────────────────────────────

export type AdminSignInResult =
  | { type: 'success' }
  | { type: 'new_password_required' }
  | { type: 'error'; message: string };

/**
 * Sign in an admin user with email + password.
 * Returns the outcome so the caller can react (success, new password required, error).
 */
export async function adminSignIn(
  email: string,
  password: string,
): Promise<AdminSignInResult> {
  configureAmplify();
  try {
    const result: SignInOutput = await amplifySignIn({ username: email, password });

    if (result.isSignedIn) {
      return { type: 'success' };
    }

    if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return { type: 'new_password_required' };
    }

    return { type: 'error', message: 'Unexpected sign-in step' };
  } catch (err: unknown) {
    // Stale session in cookies — clear it and retry once
    if (err instanceof Error && err.name === 'UserAlreadyAuthenticatedException') {
      await amplifySignOut();
      return adminSignIn(email, password);
    }
    const msg = err instanceof Error ? err.message : 'Sign-in failed';
    return { type: 'error', message: msg };
  }
}

/**
 * Complete the mandatory new-password challenge (first Cognito login).
 */
export async function completeNewPassword(
  newPassword: string,
): Promise<AdminSignInResult> {
  configureAmplify();
  try {
    const result = await confirmSignIn({ challengeResponse: newPassword });
    return result.isSignedIn ? { type: 'success' } : { type: 'error', message: 'Could not complete sign-in' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to set new password';
    return { type: 'error', message: msg };
  }
}

/**
 * Sign out the current admin user and clear all Cognito tokens.
 */
export async function adminSignOut(): Promise<void> {
  configureAmplify();
  await amplifySignOut();
}

/**
 * Returns the current Cognito access token string, or null if not signed in.
 * This token is sent as `Authorization: Bearer <token>` to the backend.
 */
export async function getAdminAccessToken(): Promise<string | null> {
  configureAmplify();
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() ?? null;
  } catch {
    return null;
  }
}

/**
 * Decode the JWT payload without verifying the signature.
 * Used client-side for lightweight checks (expiry, groups).
 * Full RS256 verification is always done by the backend.
 */
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

/**
 * Returns true if the given token is not yet expired.
 */
export function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 > Date.now();
}

// Cookie name Amplify uses for the access token (matches what middleware reads)
export const COGNITO_ACCESS_TOKEN_COOKIE = 'CognitoAccessToken';

/** Change password for the currently signed-in admin/staff user. */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  configureAmplify();
  try {
    await updatePassword({ oldPassword, newPassword });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : 'Failed to change password' };
  }
}

/** Step 1 of forgot-password: send a verification code to the user's email. */
export async function forgotPasswordRequest(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  configureAmplify();
  try {
    await resetPassword({ username: email });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not send reset code' };
  }
}

/** Step 2 of forgot-password: confirm with the code received by email. */
export async function forgotPasswordConfirm(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  configureAmplify();
  try {
    await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not reset password' };
  }
}
