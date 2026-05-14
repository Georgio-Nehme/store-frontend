'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  configureAmplify,
  adminSignIn,
  completeNewPassword,
  forgotPasswordRequest,
  forgotPasswordConfirm,
} from '@/lib/auth';

configureAmplify();

type Step = 'login' | 'new_password' | 'forgot_send' | 'forgot_confirm';

export default function AdminLoginPage() {
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    import('@/lib/auth').then(({ getAdminAccessToken }) =>
      getAdminAccessToken().then(token => {
        if (token) router.replace('/admin');
      }),
    );
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await adminSignIn(email, password);
      if (result.type === 'success') window.location.href = '/admin';
      else if (result.type === 'new_password_required') setStep('new_password');
      else setError(result.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const result = await completeNewPassword(newPassword);
      if (result.type === 'success') window.location.href = '/admin';
      else if (result.type === 'error') setError(result.message);
      else setError('Could not complete password step');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await forgotPasswordRequest(email);
      if (result.ok) {
        setInfo(`A reset code was sent to ${email}`);
        setStep('forgot_confirm');
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const result = await forgotPasswordConfirm(email, code, newPassword);
      if (result.ok) {
        setInfo('Password reset! You can now sign in.');
        setStep('login');
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
  const btnCls = 'bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors w-full';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Admin Login</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          {step === 'login' && 'Sign in to your store admin panel'}
          {step === 'new_password' && 'Your account requires a new password'}
          {step === 'forgot_send' && 'Enter your email to receive a reset code'}
          {step === 'forgot_confirm' && 'Enter the code sent to your email'}
        </p>

        {info && <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-4">{info}</p>}
        {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</p>}

        {step === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className={inputCls} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className={inputCls} />
            <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Logging in...' : 'Login'}</button>
            <button type="button" onClick={() => { setError(null); setInfo(null); setStep('forgot_send'); }} className="text-sm text-blue-600 hover:underline text-center">
              Forgot your password?
            </button>
          </form>
        )}

        {step === 'new_password' && (
          <form onSubmit={handleNewPassword} className="flex flex-col gap-4">
            <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputCls} />
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" className={inputCls} />
            <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Setting password...' : 'Set Password & Continue'}</button>
          </form>
        )}

        {step === 'forgot_send' && (
          <form onSubmit={handleForgotSend} className="flex flex-col gap-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className={inputCls} />
            <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Sending...' : 'Send Reset Code'}</button>
            <button type="button" onClick={() => { setError(null); setStep('login'); }} className="text-sm text-gray-500 hover:underline text-center">
              Back to login
            </button>
          </form>
        )}

        {step === 'forgot_confirm' && (
          <form onSubmit={handleForgotConfirm} className="flex flex-col gap-4">
            <input type="text" placeholder="Verification code" value={code} onChange={e => setCode(e.target.value)} required autoComplete="one-time-code" className={inputCls} />
            <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputCls} />
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" className={inputCls} />
            <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            <button type="button" onClick={() => { setError(null); setStep('forgot_send'); }} className="text-sm text-gray-500 hover:underline text-center">
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
