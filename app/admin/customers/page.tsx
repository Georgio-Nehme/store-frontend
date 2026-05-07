'use client';

import { useEffect, useState } from 'react';
import { adminGetCustomersWithStats } from '@/lib/api';
import { CustomerWithStats } from '@/lib/types';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await adminGetCustomersWithStats());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    [c.name, c.email, c.phone, c.address].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalRevenue = customers.reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers.length} total · ${totalRevenue.toFixed(2)} total revenue
          </p>
        </div>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, phone, or address…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="animate-pulse bg-white rounded-xl h-64" />
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500 uppercase text-xs tracking-wide">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Total Spent</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={c.address || ''}>
                    {c.address || <span className="text-gray-300">No address</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                      c.order_count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {c.order_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    ${parseFloat(c.total_spent || '0').toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-gray-400 text-center">
                    {search ? 'No customers match your search' : 'No customers yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
