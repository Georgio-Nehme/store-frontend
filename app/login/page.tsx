'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  loginCustomer, registerCustomer,
  setCustomerSession, getCustomerSession, clearCustomerSession,
} from '@/lib/api';

export default function LoginPage() {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoggedIn(!!getCustomerSession());
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await loginCustomer(email, password);
      setCustomerSession(session);
      router.push('/cart');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const _customer = await registerCustomer({ email, name, phone, password });
      // Auto-login after registration
      const session = await loginCustomer(email, password);
      setCustomerSession(session);
      router.push('/cart');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (loggedIn) {
    const session = getCustomerSession();
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-gray-700 text-lg mb-1">Welcome back{session?.name ? `, ${session.name}` : ''}!</p>
        <p className="text-gray-500 text-sm mb-6">{session?.email}</p>
        <button
          onClick={() => { clearCustomerSession(); setLoggedIn(false); }}
          className="text-red-600 hover:underline text-sm"
        >
          Logout
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10 sm:py-16">
      <div className="bg-white rounded-xl shadow p-6 sm:p-8">
        <div className="flex mb-6 border-b">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'signin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            Create Account
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</p>}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
