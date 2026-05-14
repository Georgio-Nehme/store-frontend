'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { configureAmplify, changePassword } from '@/lib/auth';

configureAmplify();

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const result = await changePassword(oldPassword, newPassword);
      if (result.ok) {
        setSuccess(true);
        setOldPassword('');
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

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-blue-600 mb-6 flex items-center gap-1">
        ← Back
      </button>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Change Password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your current password and choose a new one.</p>

        {success && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-6">
            ✓ Password changed successfully.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-6">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required autoComplete="current-password" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Min 8 characters, uppercase, number, and symbol required.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" className={inputCls} />
          </div>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors w-full mt-2">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
